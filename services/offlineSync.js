// services/offlineSync.js
// Servicio de sincronización offline-first
// 🚨 PRODUCCION: logs deshabilitados
const log = __DEV__ ? console.log : () => {};

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { collection, addDoc, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const OFFLINE_TASKS_KEY = '@offline_tasks';
const PENDING_OPERATIONS_KEY = '@pending_operations';
const LAST_SYNC_KEY = '@last_sync';

// Una operación se reintenta hasta MAX_RETRIES veces antes de descartarse
const MAX_RETRIES = 5;

// Estado de conexión
let isOnline = true;
let connectionListeners = [];

// Estado de sincronización
let isSyncing = false;
let syncListeners = [];
let cacheListeners = [];

// Errores que no se arreglan reintentando (permisos, datos inválidos, documento inexistente)
const PERMANENT_ERROR_CODES = ['permission-denied', 'not-found', 'invalid-argument', 'unauthenticated', 'failed-precondition'];
export const isPermanentError = (error) => {
  const code = error?.code || '';
  const message = error?.message || '';
  return PERMANENT_ERROR_CODES.some(c => code.includes(c)) || message.includes('No document to update');
};

const notifySyncListeners = async (syncing) => {
  if (syncListeners.length === 0) return;
  const pendingCount = await getPendingCount();
  syncListeners.forEach(listener => {
    try { listener({ syncing, pendingCount }); } catch (_e) { /* silent */ }
  });
};

// Suscribirse al estado de sincronización: callback({ syncing, pendingCount })
export const subscribeSyncStatus = (callback) => {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
};

// Suscribirse a cambios del cache local de tareas (p. ej. tareas creadas sin conexión)
export const subscribeToCacheChanges = (callback) => {
  cacheListeners.push(callback);
  return () => {
    cacheListeners = cacheListeners.filter(cb => cb !== callback);
  };
};

const notifyCacheListeners = () => {
  cacheListeners.forEach(listener => {
    try { listener(); } catch (_e) { /* silent */ }
  });
};

// Inicializar listener de conexión
export const initConnectionListener = () => {
  let firstEvent = true;
  return NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;

    log('📶 Estado de conexión:', isOnline ? 'ONLINE' : 'OFFLINE');

    // Notificar a los listeners
    connectionListeners.forEach(listener => listener(isOnline));

    // Al arrancar con conexión o al reconectar, sincronizar lo pendiente
    if (isOnline && (wasOffline || firstEvent)) {
      log('🔄 Conexión disponible - iniciando sincronización...');
      syncPendingOperations();
    }
    firstEvent = false;
  });
};

// Suscribirse a cambios de conexión
export const subscribeToConnectionState = (callback) => {
  connectionListeners.push(callback);
  // Retornar inmediatamente el estado actual
  callback(isOnline);
  
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
};

// Obtener estado de conexión actual
export const getConnectionState = () => isOnline;

// ============ CACHE LOCAL DE TAREAS ============

// Guardar tareas en cache local
// userEmail opcional: si se pasa, usa clave por usuario para evitar contaminación entre sesiones
// silent: no avisa a los listeners (para guardar la lista que ya se está mostrando)
export const cacheTasksLocally = async (tasks, userEmail, { silent = false } = {}) => {
  try {
    const key = userEmail
      ? `${OFFLINE_TASKS_KEY}_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : OFFLINE_TASKS_KEY;
    await AsyncStorage.setItem(key, JSON.stringify(tasks));
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    if (!silent) notifyCacheListeners();
  } catch (error) {
    if (__DEV__) console.error('Error guardando cache:', error);
  }
};

// Obtener tareas del cache local
// userEmail opcional: si se pasa, lee de la clave por usuario
export const getCachedTasks = async (userEmail) => {
  try {
    const key = userEmail
      ? `${OFFLINE_TASKS_KEY}_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : OFFLINE_TASKS_KEY;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Validar que sea un array
      if (Array.isArray(parsed)) {
        // Filtrar tareas inválidas (sin id)
        return parsed.filter(t => t && t.id);
      }
    }
    return [];
  } catch (error) {
    if (__DEV__) console.error('Error leyendo cache:', error);
    return [];
  }
};

// Obtener fecha de última sincronización
export const getLastSyncTime = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync) : null;
  } catch (error) {
    return null;
  }
};

// Limpiar caché de tareas de un usuario específico
// Se usa en logout para evitar que el caché de usuarios anteriores persista
export const clearUserTaskCache = async (userEmail) => {
  try {
    if (!userEmail) return;
    const key = `${OFFLINE_TASKS_KEY}_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await AsyncStorage.removeItem(key);
    log('🗑️ Caché limpiado para usuario:', userEmail);
  } catch (error) {
    if (__DEV__) console.error('Error limpiando caché de usuario:', error);
  }
};

// ============ COLA DE OPERACIONES PENDIENTES ============

// Tipos de operaciones
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  // Confirmar "mi parte" de una tarea con varios asignados
  CONFIRM: 'CONFIRM'
};

// Agregar operación a la cola
export const queueOperation = async (type, data, taskId = null, userEmail = null) => {
  try {
    const pendingOps = await getPendingOperations();

    const operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      taskId,
      userEmail,
      timestamp: Date.now(),
      retries: 0
    };
    
    // Si es UPDATE o DELETE y ya hay operaciones pendientes para esta tarea
    if (taskId && (type === OPERATION_TYPES.UPDATE || type === OPERATION_TYPES.DELETE)) {
      // Varios UPDATE de la misma tarea se combinan en uno: los campos del más reciente
      // ganan, pero los que solo cambió un UPDATE anterior no se pierden
      const filtered = pendingOps.filter(op => {
        if (op.taskId === taskId) {
          // Si la nueva operación es DELETE, eliminar todas las anteriores
          if (type === OPERATION_TYPES.DELETE) return false;
          if (type === OPERATION_TYPES.UPDATE && op.type === OPERATION_TYPES.UPDATE) {
            operation.data = { ...op.data, ...operation.data };
            return false;
          }
        }
        return true;
      });
      filtered.push(operation);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
    } else {
      pendingOps.push(operation);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
    }
    
    log('📥 Operación encolada:', type, taskId || 'nueva tarea');
    notifySyncListeners(isSyncing);
    // La lista de tareas muestra los cambios pendientes: avisar para que se actualice
    notifyCacheListeners();
    return operation.id;
  } catch (error) {
    if (__DEV__) console.error('Error encolando operación:', error);
    throw error;
  }
};

// Obtener operaciones pendientes
export const getPendingOperations = async () => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    if (__DEV__) console.error('Error leyendo operaciones pendientes:', error);
    return [];
  }
};

// Obtener cantidad de operaciones pendientes
export const getPendingCount = async () => {
  const ops = await getPendingOperations();
  return ops.length;
};

// Eliminar operación de la cola
const removeOperation = async (operationId) => {
  try {
    const pendingOps = await getPendingOperations();
    const filtered = pendingOps.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    if (__DEV__) console.error('Error eliminando operación:', error);
  }
};

// Registrar un intento fallido; devuelve true si la operación debe descartarse
const registerFailedAttempt = async (operationId) => {
  try {
    const pendingOps = await getPendingOperations();
    const op = pendingOps.find(o => o.id === operationId);
    if (!op) return true;
    op.retries = (op.retries || 0) + 1;
    if (op.retries >= MAX_RETRIES) return true;
    await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
    return false;
  } catch (error) {
    if (__DEV__) console.error('Error registrando reintento:', error);
    return false;
  }
};

// Limpiar todas las operaciones pendientes (para casos de error)
export const clearPendingOperations = async () => {
  try {
    await AsyncStorage.removeItem(PENDING_OPERATIONS_KEY);
    log('🗑️ Cola de operaciones limpiada');
    return true;
  } catch (error) {
    if (__DEV__) console.error('Error limpiando operaciones:', error);
    return false;
  }
};

// ============ SINCRONIZACIÓN ============

// Sincronizar operaciones pendientes con Firebase
export const syncPendingOperations = async () => {
  if (!isOnline) {
    log('⏳ Sin conexión - sincronización pospuesta');
    return { success: false, synced: 0, pending: await getPendingCount() };
  }
  
  // Evitar sincronizaciones simultáneas (duplicarían las operaciones CREATE)
  if (isSyncing) {
    return { success: false, synced: 0, pending: await getPendingCount() };
  }

  const pendingOps = await getPendingOperations();

  if (pendingOps.length === 0) {
    log('✅ No hay operaciones pendientes');
    return { success: true, synced: 0, pending: 0 };
  }

  log('🔄 Sincronizando', pendingOps.length, 'operaciones pendientes...');

  isSyncing = true;
  notifySyncListeners(true);

  let synced = 0;
  let errors = 0;
  let discarded = 0;

  try {
    // Ordenar por timestamp para mantener el orden correcto
    const sortedOps = [...pendingOps].sort((a, b) => a.timestamp - b.timestamp);

    for (const op of sortedOps) {
      try {
        switch (op.type) {
          case OPERATION_TYPES.CREATE:
            await syncCreateOperation(op);
            break;
          case OPERATION_TYPES.UPDATE:
            await syncUpdateOperation(op);
            break;
          case OPERATION_TYPES.DELETE:
            await syncDeleteOperation(op);
            break;
          case OPERATION_TYPES.CONFIRM:
            await syncConfirmOperation(op);
            break;
        }

        await removeOperation(op.id);
        synced++;
        log('✅ Sincronizado:', op.type, op.taskId || 'nueva');
      } catch (error) {
        if (__DEV__) console.error('❌ Error sincronizando:', op.type, error.message);

        // Errores permanentes: reintentar no sirve, descartar de inmediato
        if (isPermanentError(error)) {
          await removeOperation(op.id);
          discarded++;
          log('🗑️ Operación descartada (error permanente):', op.taskId, error.code);
          continue;
        }

        // Errores transitorios: conservar en la cola hasta agotar los reintentos
        errors++;
        if (await registerFailedAttempt(op.id)) {
          await removeOperation(op.id);
          discarded++;
          log('🗑️ Operación descartada tras agotar reintentos:', op.taskId);
        }
      }
    }
  } finally {
    isSyncing = false;
  }

  const remaining = await getPendingCount();
  log(`📊 Sincronización: ${synced} exitosos, ${discarded} descartados, ${errors} errores, ${remaining} pendientes`);

  // Notificar a los listeners
  connectionListeners.forEach(listener => listener(isOnline));
  notifySyncListeners(false);
  notifyCacheListeners();

  return { success: errors === 0, synced, discarded, pending: remaining };
};

// Los Timestamp de Firestore se serializan en la cola como { seconds, nanoseconds }
const reviveTimestamp = (value) =>
  value && typeof value === 'object' && typeof value.seconds === 'number' && typeof value.toMillis !== 'function'
    ? new Timestamp(value.seconds, value.nanoseconds || 0)
    : value;

// Sincronizar operación CREATE
const syncCreateOperation = async (op) => {
  const tasksRef = collection(db, 'tasks');
  
  const taskData = {
    ...op.data,
    createdAt: Timestamp.fromMillis(op.data.createdAt || Date.now()),
    updatedAt: Timestamp.fromMillis(op.data.updatedAt || Date.now()),
    dueAt: op.data.dueAt ? Timestamp.fromMillis(op.data.dueAt) : Timestamp.fromMillis(Date.now()),
    syncedAt: Timestamp.now()
  };
  
  // Eliminar el ID temporal
  delete taskData.id;
  delete taskData.isOffline;
  delete taskData.tempId;
  
  const docRef = await addDoc(tasksRef, taskData);

  // Lo que al crear con conexión se hace en el momento: subtareas por área y aviso a los asignados.
  // Si falla no se reintenta la operación completa (duplicaría la tarea ya creada).
  try {
    if (Array.isArray(taskData.areas) && taskData.areas.length > 1) {
      const { createAreaSubtasks } = await import('./areaSubtasks');
      await createAreaSubtasks(taskData, docRef.id);
    }
    if (Array.isArray(taskData.assignedTo) && taskData.assignedTo.length > 0) {
      const { notifyAssignment } = await import('./notifications');
      await notifyAssignment({
        id: docRef.id,
        title: taskData.title,
        dueAt: op.data.dueAt,
        assignedTo: taskData.assignedTo,
        priority: taskData.priority,
      });
    }
  } catch (postCreateError) {
    if (__DEV__) console.error('Error en pasos posteriores a crear la tarea:', postCreateError);
  }

  // 🧹 Actualizar caché local: reemplazar tarea temporal con la tarea sincronizada
  try {
    const cached = await getCachedTasks(op.userEmail);
    // Eliminar la tarea temporal
    const filtered = cached.filter(t => t.id !== op.taskId);
    // Agregar la tarea sincronizada con el nuevo ID de Firebase
    const syncedTask = {
      ...op.data,
      id: docRef.id,
      isOffline: false, // Remover el flag de offline
      createdAt: op.data.createdAt,
      updatedAt: op.data.updatedAt,
      dueAt: op.data.dueAt,
      syncedAt: Date.now()
    };
    filtered.unshift(syncedTask);
    await cacheTasksLocally(filtered, op.userEmail);
    log('✅ Caché actualizado: tarea temporal reemplazada por tarea sincronizada');
  } catch (cacheError) {
    if (__DEV__) console.error('Error actualizando caché después de sincronizar:', cacheError);
  }
};

// Sincronizar operación UPDATE
const syncUpdateOperation = async (op) => {
  if (!op.taskId || op.taskId.startsWith('temp_')) {
    log('⚠️ No se puede actualizar tarea temporal:', op.taskId);
    return;
  }
  
  const taskRef = doc(db, 'tasks', op.taskId);
  
  // Verificar si el documento existe antes de actualizar
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    log('⚠️ Documento no existe, eliminando operación de la cola:', op.taskId);
    return; // La operación se eliminará de la cola sin error
  }
  
  const updateData = {
    ...op.data,
    updatedAt: Timestamp.now(),
    syncedAt: Timestamp.now()
  };
  
  // Convertir fechas si es necesario
  if (updateData.dueAt && typeof updateData.dueAt === 'number') {
    updateData.dueAt = Timestamp.fromMillis(updateData.dueAt);
  }
  if (updateData.completedAt) {
    updateData.completedAt = reviveTimestamp(updateData.completedAt);
  }
  if (Array.isArray(updateData.completedBy)) {
    updateData.completedBy = updateData.completedBy.map(c => ({ ...c, completedAt: reviveTimestamp(c.completedAt) }));
  }
  
  // Eliminar campos undefined (Firestore no los acepta)
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });
  
  await updateDoc(taskRef, updateData);
  
  // 🧹 Actualizar caché local: remover isOffline
  try {
    const cached = await getCachedTasks(op.userEmail);
    const taskIndex = cached.findIndex(t => t.id === op.taskId);
    if (taskIndex !== -1) {
      cached[taskIndex] = {
        ...cached[taskIndex],
        ...op.data,
        isOffline: false, // Remover el flag de offline
        updatedAt: Date.now(),
        syncedAt: Date.now()
      };
      await cacheTasksLocally(cached, op.userEmail);
      log('✅ Caché actualizado: isOffline removido para tarea', op.taskId);
    }
  } catch (cacheError) {
    if (__DEV__) console.error('Error actualizando caché después de sincronizar update:', cacheError);
  }
};

// Sincronizar operación DELETE
const syncDeleteOperation = async (op) => {
  if (!op.taskId || op.taskId.startsWith('temp_')) {
    log('⚠️ No se puede eliminar tarea temporal:', op.taskId);
    return;
  }
  
  const taskRef = doc(db, 'tasks', op.taskId);
  
  // Verificar si el documento existe antes de eliminar
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    log('⚠️ Documento ya no existe, operación DELETE ignorada:', op.taskId);
    return; // Ya está eliminado, no hay error
  }
  
  // Papelera: la tarea no se borra, se marca (ver deleteTask en services/tasks.js)
  await updateDoc(taskRef, { deleted: true, deletedBy: op.userEmail || '', deletedAt: Timestamp.now() });
};

// Sincronizar operación CONFIRM: la confirmación se aplica en una transacción contra
// el estado actual de la tarea, así no pisa las confirmaciones que hicieron otros mientras tanto
const syncConfirmOperation = async (op) => {
  if (!op.taskId || op.taskId.startsWith('temp_')) return;
  const { confirmTaskCompletion } = await import('./taskConfirmations');
  await confirmTaskCompletion(op.taskId, op.data, { fromQueue: true });
};

// ============ OPERACIONES OFFLINE-FIRST ============

// Crear tarea (offline-first)
export const createTaskOffline = async (taskData) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newTask = {
    ...taskData,
    id: tempId,
    tempId: tempId,
    isOffline: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // Guardar offline
  const cached = await getCachedTasks();
  cached.unshift(newTask);
  await cacheTasksLocally(cached);
  
  // Encolar para sincronización
  await queueOperation(OPERATION_TYPES.CREATE, taskData, tempId);
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
  
  return newTask;
};

// Actualizar tarea (offline-first)
export const updateTaskOffline = async (taskId, updates) => {
  // Actualizar cache local
  const cached = await getCachedTasks();
  const taskIndex = cached.findIndex(t => t.id === taskId);
  
  if (taskIndex !== -1) {
    cached[taskIndex] = {
      ...cached[taskIndex],
      ...updates,
      updatedAt: Date.now()
    };
    await cacheTasksLocally(cached);
  }
  
  // Encolar para sincronización (solo si no es tarea temporal)
  if (!taskId.startsWith('temp_')) {
    await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId);
  }
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
  
  return cached[taskIndex];
};

// Eliminar tarea (offline-first)
export const deleteTaskOffline = async (taskId) => {
  // Eliminar del cache local
  const cached = await getCachedTasks();
  const filtered = cached.filter(t => t.id !== taskId);
  await cacheTasksLocally(filtered);
  
  // Encolar para sincronización (solo si no es tarea temporal)
  if (!taskId.startsWith('temp_')) {
    await queueOperation(OPERATION_TYPES.DELETE, {}, taskId);
  }
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
};

// Limpiar todo el cache (para logout)
export const clearOfflineData = async () => {
  try {
    // Obtener todas las claves de AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filtrar las claves que pertenecen al cache de tareas (global y por usuario).
    // La cola de operaciones pendientes NO se borra: son cambios hechos sin conexión
    // que todavía no llegan al servidor, y cerrar o iniciar sesión no debe perderlos.
    const keysToRemove = allKeys.filter(key =>
      key === OFFLINE_TASKS_KEY ||
      key.startsWith(OFFLINE_TASKS_KEY + '_') ||
      key === LAST_SYNC_KEY
    );
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      log(`🗑️ Limpiadas ${keysToRemove.length} claves de cache (incluyendo @offline_tasks_*)`);
    }
  } catch (error) {
    if (__DEV__) console.error('Error limpiando cache:', error);
  }
};

export default {
  initConnectionListener,
  subscribeToConnectionState,
  getConnectionState,
  subscribeSyncStatus,
  subscribeToCacheChanges,
  isPermanentError,
  cacheTasksLocally,
  getCachedTasks,
  getLastSyncTime,
  queueOperation,
  getPendingOperations,
  getPendingCount,
  syncPendingOperations,
  createTaskOffline,
  updateTaskOffline,
  deleteTaskOffline,
  clearOfflineData,
  OPERATION_TYPES
};
