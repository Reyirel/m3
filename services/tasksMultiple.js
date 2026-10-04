// services/tasksMultiple.js
// Servicio mejorado con soporte para asignaciones múltiples y subtareas
// Extiende/reemplaza gradualmente el servicio actual

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { notifySubtaskCompletion } from './subtaskNotifications';
import { toMs } from '../utils/dateUtils';
import { getDisplayNamesByEmail } from './usersDirectory';

const TASKS_COLLECTION = 'tasks';
const SUBTASKS_SUBCOLLECTION = 'subtasks';
const _MESSAGES_SUBCOLLECTION = 'messages';

/**
 * ============================================
 * FUNCIONES PARA ASIGNACIONES MÚLTIPLES
 * ============================================
 */

/**
 * Actualizar tarea con asignaciones múltiples
 * @param {string} taskId 
 * @param {Object} task - { title, description, dueAt, area, assignedEmails?: [...], priority, status, etc }
 */
export async function updateTaskMultiple(taskId, task) {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    
    const updateData = {
      updatedAt: serverTimestamp()
    };
    
    // Actualizar campos básicos si se proporcionan
    if (task.title) updateData.title = task.title;
    if (task.description) updateData.description = task.description;
    if (task.priority) updateData.priority = task.priority;
    if (task.area) updateData.area = task.area;
    if (task.status) updateData.status = task.status;
    if (task.dueAt) updateData.dueAt = Timestamp.fromMillis(task.dueAt);
    if (task.tags !== undefined) updateData.tags = task.tags;
    if (task.estimatedHours !== undefined) updateData.estimatedHours = task.estimatedHours;
    if (task.isRecurring !== undefined) updateData.isRecurring = task.isRecurring;
    if (task.recurrencePattern !== undefined) updateData.recurrencePattern = task.recurrencePattern;
    if (task.lastRecurrenceCreated !== undefined) updateData.lastRecurrenceCreated = task.lastRecurrenceCreated;
    if (task.notificationId !== undefined) updateData.notificationId = task.notificationId;
    
    // Si se proporcionan nuevos asignados, actualizar array con emails normalizados
    if (task.assignedEmails && Array.isArray(task.assignedEmails)) {
      const usersMap = await getDisplayNamesByEmail();
      
      // Normalizar emails
      const normalizedEmails = task.assignedEmails.map(e => e?.toLowerCase().trim()).filter(Boolean);
      
      const assignments = normalizedEmails.map(email => ({
        email: email,
        name: usersMap[email] || email,
        status: 'pendiente',
        completedAt: null
      }));
      
      updateData.assignedTo = normalizedEmails;
      updateData.assignedToNames = normalizedEmails.map(e => usersMap[e] || e);
      updateData.assignments = assignments;
    }
    
    await updateDoc(taskRef, updateData);
    
  } catch (error) {
    throw new Error(`Error actualizando tarea: ${error.message}`);
  }
}

/**
 * ============================================
 * FUNCIONES PARA SUBTAREAS
 * ============================================
 */

/**
 * Agregar subtarea a una tarea
 * @param {string} taskId 
 * @param {Object} subtask - { title, description? }
 * @returns {Promise<string>} Subtask ID
 */
export async function addSubtask(taskId, subtask) {
  try {
    // Validar datos
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      throw new Error('ID de tarea inválido');
    }
    if (!subtask.title || !subtask.title.trim()) {
      throw new Error('El título de la subtarea es requerido');
    }

    // Obtener sesión
    await getCurrentSession();

    // Verificar que la tarea padre existe antes de crear subtarea
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('La tarea padre no existe. Por favor, intenta nuevamente.');
    }

    const subtasksRef = collection(db, TASKS_COLLECTION, taskId, SUBTASKS_SUBCOLLECTION);
    
    const subtaskData = {
      title: subtask.title.trim(),
      description: subtask.description?.trim() || '',
      status: 'pendiente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: null
    };
    
    
    // Intentar agregar con manejo de error específico
    const docRef = await addDoc(subtasksRef, subtaskData);
    
    // Recalcular progreso SIN ESPERAR pero SI con mejor manejo de errores
    recalculateTaskProgress(taskId).catch(err => {
      // Este error es no crítico, la subtarea ya se creó
      if (__DEV__) console.warn('⚠️ Aviso al recalcular progreso (no crítico):', err.message);
    });
    
    return docRef.id;
  } catch (error) {
    if (__DEV__) console.error('❌ Error completo en addSubtask:', {
      message: error.message,
      code: error.code,
      name: error.name,
      taskId,
      subtask
    });
    
    // Proporcionar mensajes de error más útiles
    let userMessage = error.message;
    if (error.code === 'permission-denied') {
      userMessage = 'Sin permisos para crear subtarea. Contacta al administrador.';
    } else if (error.message?.includes('no existe')) {
      userMessage = 'La tarea no existe. Recarga e intenta de nuevo.';
    }
    
    throw new Error(userMessage);
  }
}

/**
 * Actualizar estado de una subtarea
 * @param {string} taskId 
 * @param {string} subtaskId 
 * @param {string} status - 'pendiente' | 'completada'
 */
export async function updateSubtaskStatus(taskId, subtaskId, status) {
  try {
    // Obtener datos de la subtarea antes de actualizar para la notificación
    const subtaskRef = doc(
      db, 
      TASKS_COLLECTION, 
      taskId, 
      SUBTASKS_SUBCOLLECTION, 
      subtaskId
    );

    // Obtener subtarea actual
    const subtaskSnap = await getDoc(subtaskRef);
    const subtaskData = subtaskSnap.data();
    
    const updateData = {
      status: status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'completada') {
      updateData.completedAt = serverTimestamp();
    } else {
      updateData.completedAt = null;
    }
    
    await updateDoc(subtaskRef, updateData);
    
    // Obtener sesión actual para saber quién completó
    const session = await getCurrentSession();
    const completedBy = session.success ? session.session.email : 'usuario';
    
    // Notificar si se completó
    if (status === 'completada' && subtaskData) {
      await notifySubtaskCompletion(taskId, subtaskId, completedBy, {
        title: subtaskData.title,
        description: subtaskData.description,
        id: subtaskId
      });
    }
    
    // Recalcular progreso
    await recalculateTaskProgress(taskId);
    
  } catch (error) {
    throw new Error(`Error actualizando subtarea: ${error.message}`);
  }
}

/**
 * Eliminar subtarea
 * @param {string} taskId 
 * @param {string} subtaskId 
 */
export async function deleteSubtask(taskId, subtaskId) {
  try {
    const subtaskRef = doc(
      db, 
      TASKS_COLLECTION, 
      taskId, 
      SUBTASKS_SUBCOLLECTION, 
      subtaskId
    );
    
    await deleteDoc(subtaskRef);
    
    // Recalcular progreso
    await recalculateTaskProgress(taskId);
    
  } catch (error) {
    throw new Error(`Error eliminando subtarea: ${error.message}`);
  }
}

/**
 * Obtener y escuchar subtareas de una tarea
 * @param {string} taskId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe
 */
export function subscribeToSubtasks(taskId, callback) {
  let unsubscribeListener = null;
  
  try {
    // Validar que taskId sea válido
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      if (__DEV__) console.warn('⚠️ subscribeToSubtasks: taskId inválido', { taskId });
      callback([]);
      return () => {};
    }

    // Crear el listener sin reintentos (más simple y eficiente)
    const setupListener = async () => {
      try {
        // Verificar que la tarea padre existe
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        const taskSnap = await getDoc(taskRef);
        
        if (!taskSnap.exists()) {
          if (__DEV__) console.warn(`⚠️ La tarea ${taskId} no existe en Firestore`);
          callback([]);
          return;
        }

        // Crear el listener para las subtareas
        const subtasksRef = collection(db, TASKS_COLLECTION, taskId, SUBTASKS_SUBCOLLECTION);
        const q = query(subtasksRef, orderBy('createdAt', 'asc'));
        
        unsubscribeListener = onSnapshot(
          q, 
          (snapshot) => {
            const subtasks = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: toMs(doc.data().createdAt),
              completedAt: toMs(doc.data().completedAt),
              updatedAt: toMs(doc.data().updatedAt)
            }));
            
            callback(subtasks);
          }, 
          (error) => {
            // Log pero no reintentar automáticamente - evita memory leaks
            if (__DEV__) console.error(`❌ Error en listener de subtareas para tarea ${taskId}:`, {
              code: error.code,
              message: error.message
            });
            
            // Devolver array vacío en error
            callback([]);
          }
        );
      } catch (error) {
        if (__DEV__) console.error(`❌ Error configurando listener de subtareas para ${taskId}:`, error);
        callback([]);
      }
    };

    // Ejecutar setup inicial
    setupListener();

    // Retornar función para desuscribirse
    return () => {
      if (unsubscribeListener && typeof unsubscribeListener === 'function') {
        unsubscribeListener();
      }
    };

  } catch (error) {
    if (__DEV__) console.error('❌ Error en subscribeToSubtasks:', error);
    callback([]);
    return () => {};
  }
}

/**
 * ============================================
 * FUNCIONES INTERNAS
 * ============================================
 */

/**
 * Recalcular progressPercentage basado en subtareas completadas
 * @param {string} taskId 
 */
export async function recalculateTaskProgress(taskId) {
  try {
    // Validar taskId
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      if (__DEV__) console.warn('⚠️ recalculateTaskProgress: taskId inválido', { taskId });
      return;
    }

    const subtasksRef = collection(db, TASKS_COLLECTION, taskId, SUBTASKS_SUBCOLLECTION);
    const snapshot = await getDocs(subtasksRef);
    
    if (snapshot.empty) {
      // Sin subtareas, no recalcular
      return;
    }
    
    const subtasks = snapshot.docs.map(doc => doc.data());
    const completedCount = subtasks.filter(s => s.status === 'completada').length;
    const progressPercentage = Math.round((completedCount / subtasks.length) * 100);
    
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      progressPercentage: progressPercentage,
      updatedAt: serverTimestamp()
    });
    
    
  } catch (error) {
    if (__DEV__) console.warn(`⚠️ Aviso al recalcular progreso para ${taskId}: ${error.message}`);
    // No lanzar error, es una operación secundaria
  }
}

/**
 * ============================================
 * FUNCIONES COMPATIBLES CON QUERIES MEJORADAS
 * ============================================
 */

/**
 * Suscribirse a tareas considerando asignaciones múltiples
 * @param {Function} callback 
 * @returns {Function} Unsubscribe
 */
export async function subscribeToTasksMultiple(callback) {
  try {
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) {
      callback([]);
      return () => {};
    }
    
    const { role, email, area, areasPermitidas = [], direcciones = [] } = sessionResult.session;
    const userEmail = email?.toLowerCase().trim() || '';
    
    // Helper para verificar si está asignado
    const isAssignedToUser = (task) => {
      if (!task.assignedTo) return false;
      if (Array.isArray(task.assignedTo)) {
        return task.assignedTo.some(e => e?.toLowerCase().trim() === userEmail);
      }
      return task.assignedTo?.toLowerCase().trim() === userEmail;
    };
    
    // Traer todas las tareas y filtrar localmente para soportar case-insensitive y asignaciones
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      let tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toMs(doc.data().createdAt),
        updatedAt: toMs(doc.data().updatedAt),
        dueAt: toMs(doc.data().dueAt)
      }));
      
      // Filtrar según rol
      if (role === 'admin') {
        // Admin ve todas
      } else if (role === 'secretario') {
        const userAreas = [...(area ? [area] : []), ...direcciones, ...areasPermitidas];
        tasks = tasks.filter(task => {
          const taskArea = (task.area || '').toLowerCase().trim();
          if (userAreas.some(a => a?.toLowerCase().trim() === taskArea)) return true;
          if (task.createdBy?.toLowerCase().trim() === userEmail) return true;
          if (isAssignedToUser(task)) return true;
          return false;
        });
      } else if (role === 'director') {
        const normalizedArea = area?.toLowerCase().trim() || '';
        tasks = tasks.filter(task => {
          const taskArea = (task.area || '').toLowerCase().trim();
          if (taskArea === normalizedArea) return true;
          if (task.createdBy?.toLowerCase().trim() === userEmail) return true;
          if (isAssignedToUser(task)) return true;
          return false;
        });
      } else {
        // Director ve solo tareas asignadas a él o que creó
        tasks = tasks.filter(task => {
          if (task.createdBy?.toLowerCase().trim() === userEmail) return true;
          if (isAssignedToUser(task)) return true;
          return false;
        });
      }
      
      callback(tasks);
    }, (error) => {
      if (__DEV__) console.error('Error en subscribeToTasksMultiple:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    if (__DEV__) console.error('Error:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Asignar una subtarea a un usuario específico (delegación individual)
 * @param {string} taskId - ID de la tarea padre
 * @param {string} subtaskId - ID de la subtarea
 * @param {Object} assignee - Usuario a asignar { email, displayName, area }
 * @returns {Promise<void>}
 */
export async function assignSubtaskToUser(taskId, subtaskId, assignee) {
  try {
    const subtaskRef = doc(
      db, 
      TASKS_COLLECTION, 
      taskId, 
      SUBTASKS_SUBCOLLECTION, 
      subtaskId
    );

    const subtaskSnap = await getDoc(subtaskRef);
    if (!subtaskSnap.exists()) {
      throw new Error('Subtarea no encontrada');
    }

    await updateDoc(subtaskRef, {
      assignedTo: assignee.email,
      assignedToName: assignee.displayName,
      assignedToArea: assignee.area,
      delegatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

  } catch (error) {
    if (__DEV__) console.error('Error asignando subtarea:', error);
    throw new Error(`Error al asignar subtarea: ${error.message}`);
  }
}
