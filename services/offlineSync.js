// services/offlineSync.js
// Servicio de sincronización offline-first
// 🚨 PRODUCCION: logs deshabilitados
const log = __DEV__ ? console.log : () => {};

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { updateDoc, doc, getDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';
import { addAreaSubtasksToBatch } from './areaSubtasks';

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
let discardListeners = [];

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

// Suscribirse a los cambios hechos sin conexión que no se pudieron guardar en el servidor
// y se descartaron: callback(cantidad). Sin esto el cambio desaparecía sin avisar.
export const subscribeToDiscardedOperations = (callback) => {
  discardListeners.push(callback);
  return () => {
    discardListeners = discardListeners.filter(cb => cb !== callback);
  };
};

const notifyDiscardListeners = (count) => {
  discardListeners.forEach(listener => {
    try { listener(count); } catch (_e) { /* silent */ }
  });
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

// La cola se guarda como una sola lista: leerla, cambiarla y volver a guardarla debe
// hacerse de uno en uno. Si dos cambios lo hacen a la vez, el segundo en guardar borra
// el del primero.
let queueLock = Promise.resolve();
const withQueueLock = (fn) => {
  const run = queueLock.then(fn, fn);
  queueLock = run.catch(() => {});
  return run;
};

// Agregar operación a la cola
export const queueOperation = (type, data, taskId = null, userEmail = null) => withQueueLock(async () => {
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
});

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

/**
 * ¿La operación la hizo este usuario? Las que no guardaron autor valen para cualquiera.
 * La cola se conserva al cerrar sesión, así que en un dispositivo compartido puede
 * tener cambios de otra persona.
 */
export const isOperationOfUser = (op, userEmail) =>
  !op?.userEmail || normalizeEmail(op.userEmail) === normalizeEmail(userEmail);

// Correo de la sesión abierta en este dispositivo (null si no hay sesión)
const getSessionEmail = async () => {
  try {
    const stored = await AsyncStorage.getItem('userSession');
    return stored ? normalizeEmail(JSON.parse(stored)?.email) || null : null;
  } catch (_e) {
    return null;
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
const removeOperation = (operationId) => withQueueLock(async () => {
  try {
    const pendingOps = await getPendingOperations();
    const filtered = pendingOps.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    if (__DEV__) console.error('Error eliminando operación:', error);
  }
});

// Registrar un intento fallido; devuelve true si la operación debe descartarse
const registerFailedAttempt = (operationId) => withQueueLock(async () => {
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
});

// ============ SINCRONIZACIÓN ============

// Sincronizar operaciones pendientes con Firebase
export const syncPendingOperations = async () => {
  if (!isOnline) {
    log('⏳ Sin conexión - sincronización pospuesta');
    return { success: false, synced: 0, pending: await getPendingCount() };
  }
  
  // Evitar sincronizaciones simultáneas (duplicarían las operaciones CREATE).
  // El candado se toma aquí, antes de cualquier espera: si se tomara después de leer la
  // cola, dos llamadas casi simultáneas pasarían las dos la comprobación.
  if (isSyncing) {
    return { success: false, synced: 0, pending: await getPendingCount() };
  }
  isSyncing = true;

  let synced = 0;
  let errors = 0;
  let discarded = 0;

  try {
    // Los cambios que dejó pendientes otra persona en este dispositivo no se envían con la
    // sesión actual (se harían a su nombre o se rechazarían): esperan a que vuelva a entrar
    const sessionEmail = await getSessionEmail();
    const allPendingOps = await getPendingOperations();
    const pendingOps = sessionEmail
      ? allPendingOps.filter(op => isOperationOfUser(op, sessionEmail))
      : allPendingOps;

    if (pendingOps.length === 0) {
      log('✅ No hay operaciones pendientes');
      return { success: true, synced: 0, pending: allPendingOps.length };
    }

    log('🔄 Sincronizando', pendingOps.length, 'operaciones pendientes...');
    notifySyncListeners(true);

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
  if (discarded > 0) notifyDiscardListeners(discarded);

  return { success: errors === 0, synced, discarded, pending: remaining };
};

// Los Timestamp de Firestore se serializan en la cola como { seconds, nanoseconds }
const reviveTimestamp = (value) =>
  value && typeof value === 'object' && typeof value.seconds === 'number' && typeof value.toMillis !== 'function'
    ? new Timestamp(value.seconds, value.nanoseconds || 0)
    : value;

// ID que tendrá en el servidor una tarea creada sin conexión. Se deriva de su ID temporal:
// si la app se cierra después de crear la tarea pero antes de quitarla de la cola, el
// reintento encuentra la misma tarea en lugar de crear otra.
export const serverIdForTempTask = (tempId) => `off_${String(tempId).replace(/^temp_/, '')}`;

// Sincronizar operación CREATE
const syncCreateOperation = async (op) => {
  // Las fechas llegan de la cola como número, texto o { seconds } según cómo se guardaron
  const taskData = {
    ...op.data,
    createdAt: Timestamp.fromMillis(toMs(op.data.createdAt) || Date.now()),
    updatedAt: Timestamp.fromMillis(toMs(op.data.updatedAt) || Date.now()),
    dueAt: Timestamp.fromMillis(toMs(op.data.dueAt) || Date.now()),
    syncedAt: Timestamp.now()
  };

  // Eliminar el ID temporal
  delete taskData.id;
  delete taskData.isOffline;
  delete taskData.tempId;

  const taskId = serverIdForTempTask(op.taskId || op.id);
  const taskRef = doc(db, 'tasks', taskId);

  // Si un intento anterior ya la creó, no se vuelve a crear
  const existing = await getDoc(taskRef);
  if (!existing.exists()) {
    // La tarea y sus subtareas por área van en un solo lote: o se guarda todo o nada
    const batch = writeBatch(db);
    batch.set(taskRef, taskData);
    addAreaSubtasksToBatch(batch, taskData, taskId);
    await batch.commit();

    // Aviso a los asignados. Si falla no se reintenta la operación: la tarea ya existe.
    try {
      if (Array.isArray(taskData.assignedTo) && taskData.assignedTo.length > 0) {
        const { notifyAssignment } = await import('./notifications');
        await notifyAssignment({
          id: taskId,
          title: taskData.title,
          dueAt: op.data.dueAt,
          assignedTo: taskData.assignedTo,
          priority: taskData.priority,
        });
      }
    } catch (postCreateError) {
      if (__DEV__) console.error('Error avisando a los asignados de la tarea creada:', postCreateError);
    }
  }

  // 🧹 Actualizar caché local: reemplazar tarea temporal con la tarea sincronizada
  try {
    const cached = await getCachedTasks(op.userEmail);
    // Eliminar la tarea temporal
    const filtered = cached.filter(t => t.id !== op.taskId);
    // Agregar la tarea sincronizada con el nuevo ID de Firebase
    const syncedTask = {
      ...op.data,
      id: taskId,
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
  subscribeToDiscardedOperations,
  isPermanentError,
  isOperationOfUser,
  cacheTasksLocally,
  getCachedTasks,
  getLastSyncTime,
  queueOperation,
  getPendingOperations,
  getPendingCount,
  syncPendingOperations,
  clearOfflineData,
  OPERATION_TYPES
};
