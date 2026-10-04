// services/tasks.js
// Servicio para gestionar tareas con Firebase Firestore en tiempo real
// Con soporte OFFLINE-FIRST
// __DEV__ ya está declarado como global en eslint.config.js
const _isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
const log = _isDev ? console.log : () => {};
import logger from './Logger';
import { toMs } from '../utils/dateUtils';
import { normalizeStatus } from '../utils/taskHelpers';
import { filterVisibleTasks, getUserSecretaria, getTaskAreas } from '../utils/taskVisibility';
import { getSecretariasForAreas } from '../config/areas';
import { updateParentTaskProgress } from './areaSubtasks';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { notifyTaskAssigned } from './emailNotifications';
import { notifyAssignment } from './notifications';
import { getGeneralMetrics } from './analytics';
import { validateData } from '../utils/dataValidation';
import { withRetry } from '../utils/errorRecovery';
import { checkRateLimit } from '../utils/rateLimiter';
import {
  cacheTasksLocally,
  getCachedTasks,
  getConnectionState,
  getPendingOperations,
  queueOperation,
  subscribeToCacheChanges,
  isPermanentError,
  OPERATION_TYPES
} from './offlineSync';

const COLLECTION_NAME = 'tasks';

// 🔍 DIAGNÓSTICO: Detectar si emulador está activo
function detectEmulator() {
  try {
    // En Firestore modular, si se usa connectFirestoreEmulator(), la conexión se hace en firebase.js
    // No hay forma directa de detectarlo, pero podemos chequear si hay configuración en localStorage o envs
    const emuHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST;
    const emuPort = process.env.REACT_APP_FIRESTORE_EMULATOR_PORT;
    
    if (emuHost || emuPort) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

const _isEmulatorActive = detectEmulator();

// Cache eliminado para tiempo real verdadero
let _activeSubscriptions = 0;
const _MAX_SUBSCRIPTIONS = 3; // Aumentar suscripciones permitidas

/**
 * Esperar a que la sesión esté disponible (con retry logic)
 * Este es un blocker - NO retorna hasta que haya sesión o se agotan reintentos
 * @param {number} maxRetries - Intentos máximos (default 30 = 3 segundos)
 * @param {number} initialDelay - Delay inicial en ms (default 100)
 * @returns {Promise} Sesión del usuario o null
 */
async function waitForSession(maxRetries = 30, initialDelay = 100) {
  let delay = initialDelay;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await getCurrentSession();
      if (result.success && result.session) {
        log(`✅ Sesión encontrada en intento ${attempt + 1}`);
        return result.session;
      }
    } catch (error) {
      lastError = error;
    }
    
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
      // Backoff: 100, 110, 120, 131, ...  hasta ~2000ms
      delay = Math.min(delay * 1.1, 2000);
    }
  }
  
  if (__DEV__) console.warn(`⚠️  No se encontró sesión después de ${maxRetries} intentos. Último error:`, lastError?.message);
  return null;
}

/**
 * Aplica sobre la lista de tareas los cambios hechos sin conexión que siguen en la cola,
 * para que la pantalla los muestre antes de que lleguen al servidor.
 * @param {Array} tasks - Tareas (del servidor o de la copia guardada)
 * @param {Array} pendingOps - Operaciones pendientes de offlineSync
 * @returns {Array} Tareas con los cambios pendientes aplicados (pendingSync: true)
 */
export function applyPendingOperations(tasks, pendingOps) {
  if (!pendingOps || pendingOps.length === 0) return tasks;

  const opsByTask = new Map();
  [...pendingOps]
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .forEach(op => {
      if (!op.taskId) return;
      if (!opsByTask.has(op.taskId)) opsByTask.set(op.taskId, []);
      opsByTask.get(op.taskId).push(op);
    });
  if (opsByTask.size === 0) return tasks;

  return tasks
    .map(task => {
      const ops = opsByTask.get(task.id);
      if (!ops) return task;

      let updated = { ...task, pendingSync: true };
      ops.forEach(op => {
        if (op.type === OPERATION_TYPES.UPDATE) {
          updated = { ...updated, ...op.data };
        } else if (op.type === OPERATION_TYPES.DELETE) {
          updated.deleted = true;
        } else if (op.type === OPERATION_TYPES.CONFIRM) {
          const email = (op.data?.email || '').toLowerCase().trim();
          const completedBy = updated.completedBy || [];
          if (email && !completedBy.some(c => (c.email || '').toLowerCase().trim() === email)) {
            updated.completedBy = [...completedBy, { ...op.data, email, completedAt: op.timestamp, pendingSync: true }];
          }
        }
      });
      updated.status = normalizeStatus(updated.status);
      return updated;
    })
    .filter(task => !task.deleted);
}

/**
 * Suscribirse a cambios en tiempo real de las tareas del usuario autenticado
 * @param {Function} callback - Recibe la lista de tareas visibles para el usuario
 * @param {Object} [knownSession] - Sesión ya resuelta (AuthContext); evita esperar a leerla
 */
export async function subscribeToTasks(callback, knownSession) {
  try {
    logger.debug('TasksService', 'subscribeToTasks called');
    logger.perfStart('subscribeToTasks');
    _activeSubscriptions++;

    const session = knownSession?.email ? knownSession : await waitForSession();
    
    if (!session) {
      _activeSubscriptions--;
      logger.warn('TasksService', 'No session available for task subscription');
      callback([]);
      return () => { _activeSubscriptions--; };
    }
    
    const userRole = session.role;
    const userEmail = session.email;
    logger.debug('TasksService', 'Task subscription setup', { userRole, userEmail });

    // Cada rol descarga solo lo que puede ver (misma regla que firestore.secure.rules):
    //   admin      → todas
    //   director   → las asignadas a su correo
    //   secretario → las asignadas a su correo + las de su secretaría (campo `secretarias`)
    // Sin orderBy en las consultas filtradas para no requerir índice compuesto.
    const tasksRef = collection(db, COLLECTION_NAME);
    const assignedQuery = query(tasksRef, where('assignedTo', 'array-contains', userEmail));
    let taskQueries;
    if (userRole === 'admin') {
      taskQueries = [query(tasksRef, orderBy('createdAt', 'desc'))];
    } else if (userRole === 'secretario') {
      const secretaria = getUserSecretaria(session);
      taskQueries = secretaria
        ? [assignedQuery, query(tasksRef, where('secretarias', 'array-contains', secretaria))]
        : [assignedQuery];
    } else if (userRole === 'director') {
      taskQueries = [assignedQuery];
    } else {
      taskQueries = [];
    }

    let isSubscribed = true;
    let serverTasks = [];
    // true cuando Firestore ya entregó datos (del servidor o de su propio cache)
    let hasServerData = false;
    // Resultado de cada consulta (id → tarea); se combinan sin duplicados
    const queryResults = taskQueries.map(() => new Map());

    const isTempTask = (t) => t.isOffline && String(t.id).startsWith('temp_');

    // Emitir las tareas con los cambios hechos sin conexión que aún no se sincronizan:
    //   - tareas creadas sin conexión (temporales)
    //   - cambios pendientes en la cola (estado, confirmaciones, papelera)
    // Si Firestore aún no entrega nada (app abierta sin red), se usa la última copia guardada.
    const emit = async ({ skipIfEmpty = false } = {}) => {
      const [cached, pendingOps] = await Promise.all([getCachedTasks(userEmail), getPendingOperations()]);
      if (!isSubscribed) return;
      const tempTasks = cached
        .filter(isTempTask)
        .map(t => ({
          ...t,
          assignedTo: Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [],
          status: normalizeStatus(t.status),
          isDueOverdue: false,
        }));
      const baseTasks = hasServerData
        ? serverTasks
        : filterVisibleTasks(cached.filter(t => !isTempTask(t)), session);
      const tasks = [...tempTasks, ...applyPendingOperations(baseTasks, pendingOps)];
      if (skipIfEmpty && tasks.length === 0) return;
      callback(tasks);
    };
    const unsubscribeCache = subscribeToCacheChanges(() => emit());

    // Guardar la lista del servidor en el dispositivo para poder verla sin conexión
    const persistServerTasks = async () => {
      try {
        const cached = await getCachedTasks(userEmail);
        await cacheTasksLocally([...cached.filter(isTempTask), ...serverTasks], userEmail, { silent: true });
      } catch (e) {
        log('⚠️ Error guardando copia local de tareas:', e.message);
      }
    };

    // Mostrar de inmediato la última copia guardada mientras responde Firestore
    emit({ skipIfEmpty: true });

    // includeMetadataChanges: sin esto, cuando el cache está vacío y el servidor también
    // responde vacío, Firestore no vuelve a avisar y la pantalla se quedaba cargando.
    const unsubscribeListeners = taskQueries.map((tasksQuery, queryIndex) => onSnapshot(
      tasksQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isSubscribed) return;

        // Sin red y sin cache de Firestore (app nativa recién abierta) llega un resultado
        // vacío "desde cache": no es que no haya tareas, se muestra la copia guardada.
        // Siempre se emite algo, para que las pantallas dejen de mostrar "cargando".
        if (snapshot.metadata?.fromCache && snapshot.empty && !hasServerData) {
          emit();
          return;
        }
        hasServerData = true;

        const now = Date.now();
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data();
          const status = normalizeStatus(data.status);
          const dueAt = toMs(data.dueAt) || now;
          const closedStatuses = ['cerrada', 'cerrado', 'completado'];
          // Normalizar assignedTo — siempre array para que los filtros y queries funcionen consistentemente
          const rawAssigned = data.assignedTo;
          const assignedTo = Array.isArray(rawAssigned)
            ? rawAssigned
            : rawAssigned
              ? [rawAssigned]
              : [];
          return {
            id: doc.id,
            ...data,
            assignedTo,
            status,
            createdAt: toMs(data.createdAt) || now,
            updatedAt: toMs(data.updatedAt) || now,
            dueAt,
            isDueOverdue: dueAt < now && !closedStatuses.includes(status),
          };
        });

        queryResults[queryIndex] = new Map(tasks.map(task => [task.id, task]));
        const merged = new Map();
        queryResults.forEach(result => result.forEach((task, id) => merged.set(id, task)));

        // Segundo filtro en el cliente: descarta la papelera y cualquier tarea fuera del ámbito del rol
        const filteredTasks = filterVisibleTasks([...merged.values()], session);
        // Ordenar por createdAt descendente (las consultas filtradas no usan orderBy)
        filteredTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        logger.debug('TasksService', `Loaded ${filteredTasks.length} tasks`);
        serverTasks = filteredTasks;
        emit();
        if (!snapshot.metadata?.fromCache) persistServerTasks();
      },
      (error) => {
        logger.error('TasksService', 'Snapshot listener error', error);
        // Una consulta que falla no debe ocultar los resultados de la otra ni la copia guardada
        queryResults[queryIndex] = new Map();
        emit();
      }
    ));

    if (taskQueries.length === 0) callback([]);

    // Retornar función de cleanup
    return () => {
      isSubscribed = false;
      _activeSubscriptions--;
      logger.debug('TasksService', 'Task subscription cleanup');
      unsubscribeCache();
      unsubscribeListeners.forEach(unsubscribe => unsubscribe && unsubscribe());
    };
  } catch (error) {
    logger.error('TasksService', 'Critical error in subscribeToTasks', error);
    _activeSubscriptions--;
    callback([]);
    return () => {};
  }
}

/**
 * Crear una nueva tarea en Firebase con información del usuario
 * OFFLINE-FIRST: Si no hay conexión, guarda localmente y sincroniza después
 * @param {Object} task - Objeto con datos de la tarea
 * @returns {Promise<string>} ID de la tarea creada
 */
export async function createTask(task) {
  let currentUserEmail = '';
  try {
    // ⏱️ Rate limiting check
    const rateCheck = await checkRateLimit('createTask');
    if (!rateCheck.allowed) {
      const error = new Error(rateCheck.message);
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }

    // 🔍 Validar datos antes de procesar
    const validation = validateData(task, 'task');
    if (!validation.valid) {
      logger.warn('TasksService', 'Invalid task data', { errors: validation.errors });
      const error = new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      error.code = 'INVALID_DATA';
      throw error;
    }

    // Obtener información del usuario actual
    const sessionResult = await getCurrentSession();
    const currentUserUID = sessionResult.success ? sessionResult.session.userId : 'anonymous';
    const currentUserName = sessionResult.success ? sessionResult.session.displayName : 'Usuario Anónimo';
    currentUserEmail = sessionResult.success ? sessionResult.session.email : '';

    const taskData = {
      ...task,
      createdBy: currentUserEmail || currentUserUID,
      createdByName: currentUserName,
      department: task.department || '',
      // Secretarías que pueden ver la tarea (visibilidad del secretario)
      secretarias: Array.isArray(task.secretarias) && task.secretarias.length > 0
        ? task.secretarias
        : getSecretariasForAreas(getTaskAreas(task)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueAt: task.dueAt != null ? task.dueAt : Date.now(),
      tags: task.tags || [],
      estimatedHours: task.estimatedHours || null
    };

    // Si hay conexión, crear directamente en Firebase
    if (getConnectionState()) {
      const firestoreData = {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dueAt: Timestamp.fromMillis(task.dueAt || Date.now())
      };

      // 🔄 Retry automático con backoff exponencial
      const docRef = await withRetry(
        async () => {
          return await addDoc(collection(db, COLLECTION_NAME), firestoreData);
        },
        'createTask',
        { maxRetries: 3 }
      );
      
      // 🔔 Enviar notificaciones a los asignados
      // Soporta tanto string como array
      if (task.assignedTo) {
        try {
          // Usar notifyAssignment para notificaciones in-app/FCM (soporta arrays)
          // Esto crea notificaciones en Firestore que se sincronizarán con los usuarios
          await notifyAssignment({
            id: docRef.id,
            title: task.title,
            description: task.description || '',
            dueAt: task.dueAt,
            assignedTo: task.assignedTo,
            priority: task.priority,
            area: task.area
          }).catch(err => {
            log('⚠️ Error en notifyAssignment:', err.message);
          });
          
          // También intentar enviar email (backcompat con string o array)
          if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
            notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
              .catch(err => {
                log('⚠️ Error notificación email:', err.message);
              });
          } else if (task.assignedTo && typeof task.assignedTo === 'string') {
            notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
              .catch(err => {
                log('⚠️ Error notificación email:', err.message);
              });
          }
        } catch (notifErr) {
          logger.warn('TasksService', 'Error sending notifications', { 
            taskId: docRef.id, 
            error: notifErr.message 
          });
        }
      }
      
      logger.info('TasksService', 'Task created', { taskId: docRef.id });
      return docRef.id;
    } else {
      // MODO OFFLINE: Guardar localmente y encolar para sincronización
      log('📴 Creando tarea offline');

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineTask = {
        ...taskData,
        id: tempId,
        isOffline: true
      };

      // Agregar al cache local (con clave por usuario)
      const cached = await getCachedTasks(currentUserEmail);
      cached.unshift(offlineTask);
      await cacheTasksLocally(cached, currentUserEmail);

      // Encolar para sincronización
      await queueOperation(OPERATION_TYPES.CREATE, taskData, tempId, currentUserEmail);

      logger.info('TasksService', 'Task queued offline', { tempId });
      return tempId;
    }
  } catch (error) {
    // Rate limit, datos inválidos y errores permanentes (permisos, etc.) no se
    // reintentan offline: se propagan al caller
    if (error.code === 'RATE_LIMIT_EXCEEDED' || error.code === 'INVALID_DATA' || isPermanentError(error)) throw error;

    // Si falla por un error transitorio, intentar modo offline
    log('⚠️ Error creando tarea, guardando offline:', error.message);

    const tempId = `temp_${Date.now()}`;
    const taskData = {
      ...task,
      id: tempId,
      isOffline: true,
      createdBy: currentUserEmail,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const cached = await getCachedTasks(currentUserEmail);
    cached.unshift(taskData);
    await cacheTasksLocally(cached, currentUserEmail);
    await queueOperation(OPERATION_TYPES.CREATE, taskData, tempId, currentUserEmail);

    return tempId;
  }
}

/**
 * Actualizar una tarea existente
 * OFFLINE-FIRST: Actualiza localmente y sincroniza cuando hay conexión
 * @param {string} taskId - ID de la tarea
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<void>}
 */
export async function updateTask(taskId, updates) {
  let cacheUserEmail;

  // Solo el administrador puede finalizar una tarea. Se valida aquí, y no solo en
  // cada pantalla, para que ningún botón pueda saltarse la regla.
  if (updates.status && normalizeStatus(updates.status) === 'cerrada') {
    const sessionResult = await getCurrentSession();
    const role = sessionResult.success ? sessionResult.session?.role : null;
    if (role !== 'admin') {
      const error = new Error('Solo el administrador puede finalizar tareas');
      error.code = 'permission-denied';
      throw error;
    }
  }

  try {
    // Si el status cambia a "cerrada", añadir completedBy automáticamente
    if (updates.status === 'cerrada') {
      try {
        const sessionResult = await getCurrentSession();
        if (sessionResult.success && sessionResult.session) {
          const userEmail = sessionResult.session.email;
          const _userName = sessionResult.session.displayName || userEmail;

          // Obtener la tarea actual para ver los asignados
          // (sin conexión, de la copia guardada: leer de Firestore se quedaría esperando)
          let taskData = null;
          if (getConnectionState()) {
            const taskSnap = await getDoc(doc(db, COLLECTION_NAME, taskId));
            taskData = taskSnap.exists() ? taskSnap.data() : null;
          } else {
            taskData = (await getCachedTasks(userEmail)).find(t => t.id === taskId) || null;
          }

          if (taskData) {
            const assignedTo = taskData.assignedTo || [];
            const existingCompletedBy = taskData.completedBy || [];
            
            // Crear registros de completedBy para todos los asignados
            const newCompletedBy = [...existingCompletedBy];
            
            assignedTo.forEach(email => {
              // Solo añadir si no existe ya
              if (!newCompletedBy.some(c => c.email?.toLowerCase() === email.toLowerCase())) {
                // auto: el cierre lo hizo el administrador, no una confirmación del asignado
                newCompletedBy.push({
                  email: email,
                  completedAt: Timestamp.now(),
                  displayName: email,
                  auto: true
                });
              }
            });
            
            updates.completedBy = newCompletedBy;
            updates.completedAt = Timestamp.now();
            updates.progress = 100;
          }
        }
      } catch (e) {
        log('⚠️ Error añadiendo completedBy:', e.message);
      }
    }
    
    // Obtener email del usuario para usar cache por usuario
    try {
      const sess = await getCurrentSession();
      cacheUserEmail = sess.success ? sess.session?.email : undefined;
    } catch (_) {}

    // Actualizar cache local primero
    const cached = await getCachedTasks(cacheUserEmail);
    const taskIndex = cached.findIndex(t => t.id === taskId);

    if (taskIndex !== -1) {
      cached[taskIndex] = {
        ...cached[taskIndex],
        ...updates,
        updatedAt: Date.now()
      };
      await cacheTasksLocally(cached, cacheUserEmail);
    }

    // Si es una tarea temporal (offline), solo encolar
    if (taskId.startsWith('temp_')) {
      log('📴 Tarea temporal - actualizando solo localmente');
      return;
    }

    // Si hay conexión, actualizar en Firebase
    if (getConnectionState()) {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Convertir dueAt a Timestamp si existe
      if (updates.dueAt) {
        updateData.dueAt = Timestamp.fromMillis(updates.dueAt);
      }

      await updateDoc(taskRef, updateData);

      // Si es la subtarea de un área, reflejar el cambio en el avance de la tarea principal
      if (updates.status) {
        refreshParentProgress(taskRef).catch(e => log('⚠️ Error actualizando avance de la tarea principal:', e.message));
      }
    } else {
      // MODO OFFLINE: Encolar para sincronización
      log('📴 Actualizando tarea offline');
      await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId, cacheUserEmail);
    }
  } catch (error) {
    // Errores permanentes (permisos, documento inexistente): avisar al caller
    if (isPermanentError(error)) throw error;

    // Si falla Firebase por un error transitorio, encolar para después
    log('⚠️ Error actualizando, encolando para después:', error.message);
    await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId, cacheUserEmail);
  }
}

/**
 * Si la tarea es la subtarea de un área, recalcula el avance de la tarea principal
 */
async function refreshParentProgress(taskRef) {
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const { parentTaskId, isAreaSubtask } = snap.data();
  if (parentTaskId && isAreaSubtask) {
    await updateParentTaskProgress(parentTaskId);
  }
}

/**
 * Eliminar una tarea: la manda a la papelera (deleted: true), NO borra el documento.
 * Así un borrado por error se puede deshacer con restoreTask y no se pierden
 * la descripción, el chat ni las subtareas.
 * OFFLINE-FIRST: la quita del cache local y sincroniza cuando hay conexión
 * @param {string} taskId - ID de la tarea a eliminar
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  if (!taskId) {
    throw new Error('taskId es requerido para eliminar');
  }

  let cacheUserEmail;
  let role = null;
  try {
    const sess = await getCurrentSession();
    cacheUserEmail = sess.success ? sess.session?.email : undefined;
    role = sess.success ? sess.session?.role : null;
  } catch (_) {}

  // Las tareas temporales (creadas sin conexión) solo viven en el cache local
  const isTemp = taskId.startsWith('temp_');
  if (!isTemp && role !== 'admin') {
    const error = new Error('Solo el administrador puede eliminar tareas');
    error.code = 'permission-denied';
    throw error;
  }

  const trashFields = { deleted: true, deletedBy: cacheUserEmail || '' };

  try {
    // Eliminar del cache local primero
    const cached = await getCachedTasks(cacheUserEmail);
    const filtered = cached.filter(t => t.id !== taskId);
    await cacheTasksLocally(filtered, cacheUserEmail);

    if (isTemp) {
      log('📴 Tarea temporal eliminada del cache');
      return;
    }

    if (getConnectionState()) {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(taskRef, { ...trashFields, deletedAt: serverTimestamp() });
    } else {
      // MODO OFFLINE: Encolar para sincronización
      log('📴 Eliminación encolada para sincronización');
      await queueOperation(OPERATION_TYPES.UPDATE, { ...trashFields, deletedAt: Date.now() }, taskId, cacheUserEmail);
    }
    return;

  } catch (error) {
    // Errores permanentes (permisos, documento inexistente): avisar al caller
    if (isPermanentError(error)) throw error;

    // Si falla Firebase por un error transitorio, encolar para después
    log('⚠️ Error eliminando, encolando para después:', error.message);
    await queueOperation(OPERATION_TYPES.UPDATE, { ...trashFields, deletedAt: Date.now() }, taskId, cacheUserEmail);
  }
}

/**
 * Restaurar una tarea de la papelera
 * @param {string} taskId - ID de la tarea a restaurar
 * @returns {Promise<void>}
 */
export async function restoreTask(taskId) {
  if (!taskId) {
    throw new Error('taskId es requerido para restaurar');
  }
  const restoredFields = {
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: serverTimestamp()
  };
  await updateDoc(doc(db, COLLECTION_NAME, taskId), restoredFields);

  // Las subtareas por área se fueron a la papelera junto con la tarea: regresan con ella
  try {
    const subtasks = await getDocs(query(collection(db, COLLECTION_NAME), where('parentTaskId', '==', taskId)));
    await Promise.all(
      subtasks.docs
        .filter(subtask => subtask.data().deleted)
        .map(subtask => updateDoc(subtask.ref, restoredFields))
    );
  } catch (e) {
    log('⚠️ Error restaurando subtareas:', e.message);
  }
}

/**
 * Suscribirse a la papelera (tareas eliminadas). Solo para el administrador.
 * Las subtareas por área no se listan: se restauran junto con su tarea principal.
 * @param {Function} callback - Recibe la lista, de la eliminada más reciente a la más antigua
 * @param {Function} [onError]
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeToTrash(callback, onError) {
  const trashQuery = query(collection(db, COLLECTION_NAME), where('deleted', '==', true));
  return onSnapshot(trashQuery, (snapshot) => {
    const tasks = snapshot.docs
      .map(d => {
        const data = d.data();
        return { id: d.id, ...data, deletedAt: toMs(data.deletedAt), createdAt: toMs(data.createdAt) };
      })
      .filter(task => !task.isAreaSubtask)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    callback(tasks);
  }, (error) => {
    logger.error('TasksService', 'Trash listener error', error);
    if (onError) onError(error);
  });
}

/**
 * Cargar tareas (fallback si Firebase no está disponible)
 * @returns {Promise<Array>} Array de tareas
 */
export async function loadTasks() {
  return [];
}

/**
 * Obtener métricas generales de tareas del usuario actual
 * @returns {Promise<Object>} Métricas de tareas incluyendo total, completed, etc.
 */
export async function getOverallTaskMetrics() {
  try {
    const sessionResult = await getCurrentSession();
    
    if (!sessionResult.success || !sessionResult.session) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        inReview: 0,
        overdue: 0,
        completionRate: 0,
        avgCompletionTime: 0,
        byPriority: { alta: 0, media: 0, baja: 0 },
        periods: {
          today: { created: 0, completed: 0 },
          week: { created: 0, completed: 0 },
          month: { created: 0, completed: 0 },
        },
        weeklyProductivity: 0,
      };
    }

    const session = sessionResult.session;
    const metricsResult = await getGeneralMetrics(session.userId, session.role, session);
    
    if (metricsResult.success) {
      return metricsResult.metrics;
    }
    
    return {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      byPriority: { alta: 0, media: 0, baja: 0 },
      periods: {
        today: { created: 0, completed: 0 },
        week: { created: 0, completed: 0 },
        month: { created: 0, completed: 0 },
      },
      weeklyProductivity: 0,
    };
  } catch (error) {
    if (__DEV__) console.error('Error getting overall task metrics:', error);
    return {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      byPriority: { alta: 0, media: 0, baja: 0 },
      periods: {
        today: { created: 0, completed: 0 },
        week: { created: 0, completed: 0 },
        month: { created: 0, completed: 0 },
      },
      weeklyProductivity: 0,
    };
  }
}
