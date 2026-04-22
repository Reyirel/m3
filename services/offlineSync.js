// services/offlineSync.js
// Servicio de sincronización offline-first
// 🚨 PRODUCCION: logs deshabilitados
const log = __DEV__ ? console.log : () => {};

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const OFFLINE_TASKS_KEY = '@offline_tasks';
const PENDING_OPERATIONS_KEY = '@pending_operations';
const LAST_SYNC_KEY = '@last_sync';

// Estado de conexión
let isOnline = true;
let connectionListeners = [];

// Inicializar listener de conexión
export const initConnectionListener = () => {
  return NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;
    
    log('📶 Estado de conexión:', isOnline ? 'ONLINE' : 'OFFLINE');
    
    // Notificar a los listeners
    connectionListeners.forEach(listener => listener(isOnline));
    
    // Si volvimos a estar online, sincronizar
    if (wasOffline && isOnline) {
      log('🔄 Reconectado - iniciando sincronización...');
      syncPendingOperations();
    }
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
export const cacheTasksLocally = async (tasks, userEmail) => {
  try {
    const key = userEmail
      ? `${OFFLINE_TASKS_KEY}_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : OFFLINE_TASKS_KEY;
    await AsyncStorage.setItem(key, JSON.stringify(tasks));
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error guardando cache:', error);
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
    console.error('Error leyendo cache:', error);
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
    console.error('Error limpiando caché de usuario:', error);
  }
};

// ============ COLA DE OPERACIONES PENDIENTES ============

// Tipos de operaciones
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
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
      // Eliminar operaciones anteriores de UPDATE para la misma tarea (mantener solo la última)
      const filtered = pendingOps.filter(op => {
        if (op.taskId === taskId) {
          // Si la nueva operación es DELETE, eliminar todas las anteriores
          if (type === OPERATION_TYPES.DELETE) return false;
          // Si es UPDATE, eliminar solo otros UPDATE
          if (type === OPERATION_TYPES.UPDATE && op.type === OPERATION_TYPES.UPDATE) return false;
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
    return operation.id;
  } catch (error) {
    console.error('Error encolando operación:', error);
    throw error;
  }
};

// Obtener operaciones pendientes
export const getPendingOperations = async () => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Error leyendo operaciones pendientes:', error);
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
    console.error('Error eliminando operación:', error);
  }
};

// Limpiar todas las operaciones pendientes (para casos de error)
export const clearPendingOperations = async () => {
  try {
    await AsyncStorage.removeItem(PENDING_OPERATIONS_KEY);
    log('🗑️ Cola de operaciones limpiada');
    return true;
  } catch (error) {
    console.error('Error limpiando operaciones:', error);
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
  
  const pendingOps = await getPendingOperations();
  
  if (pendingOps.length === 0) {
    log('✅ No hay operaciones pendientes');
    return { success: true, synced: 0, pending: 0 };
  }
  
  log('🔄 Sincronizando', pendingOps.length, 'operaciones pendientes...');
  
  let synced = 0;
  let errors = 0;
  let discarded = 0;
  
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
      }
      
      await removeOperation(op.id);
      synced++;
      log('✅ Sincronizado:', op.type, op.taskId || 'nueva');
    } catch (error) {
      console.error('❌ Error sincronizando:', op.type, error.message);
      
      // Si el documento no existe, descartar inmediatamente
      if (error.message.includes('No document to update') || 
          error.message.includes('not-found') ||
          error.code === 'not-found') {
        await removeOperation(op.id);
        discarded++;
        log('🗑️ Operación descartada (documento no existe):', op.taskId);
        continue;
      }
      
      errors++;
      // Descartar después de 2 reintentos para no acumular errores
      await removeOperation(op.id);
      log('🗑️ Operación descartada por error:', op.taskId);
    }
  }
  
  const remaining = await getPendingCount();
  log(`📊 Sincronización: ${synced} exitosos, ${discarded} descartados, ${errors} errores, ${remaining} pendientes`);
  
  // Notificar a los listeners
  connectionListeners.forEach(listener => listener(isOnline));
  
  return { success: errors === 0, synced, pending: remaining };
};

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
    console.error('Error actualizando caché después de sincronizar:', cacheError);
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
    console.error('Error actualizando caché después de sincronizar update:', cacheError);
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
  
  await deleteDoc(taskRef);
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
    
    // Filtrar las claves que pertenecen al cache de tareas (global y por usuario)
    const keysToRemove = allKeys.filter(key => 
      key === OFFLINE_TASKS_KEY || 
      key.startsWith(OFFLINE_TASKS_KEY + '_') ||
      key === PENDING_OPERATIONS_KEY ||
      key === LAST_SYNC_KEY
    );
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      log(`🗑️ Limpiadas ${keysToRemove.length} claves de cache (incluyendo @offline_tasks_*)`);
    }
  } catch (error) {
    console.error('Error limpiando cache:', error);
  }
};

export default {
  initConnectionListener,
  subscribeToConnectionState,
  getConnectionState,
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
