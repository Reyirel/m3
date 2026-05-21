// services/areaSubtasks.js
// Sistema de subtareas automáticas por área
// Cuando una tarea se asigna a múltiples áreas, se crean subtareas coordinadas

import { collection, doc, getDoc, updateDoc, query, where, getDocs, Timestamp, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Crear subtareas automáticas para cada área asignada
 * @param {object} parentTask - Tarea padre con múltiples áreas
 * @param {string} parentTaskId - ID de la tarea padre
 * @returns {Promise<{success: boolean, subtasks: Array}>}
 */
export const createAreaSubtasks = async (parentTask, parentTaskId) => {
  try {
    const areas = parentTask.areas || [parentTask.area];
    
    // Solo crear subtareas si hay más de un área
    if (areas.length <= 1) {
      return { success: true, subtasks: [], message: 'Tarea de un solo área, no requiere subtareas' };
    }
    
    const batch = writeBatch(db);
    const subtasks = [];
    const tasksRef = collection(db, 'tasks');
    
    for (const area of areas) {
      // Buscar usuarios asignados de esta área específica
      const areaAssignees = [];
      const areaAssigneeNames = [];
      
      if (parentTask.assignedTo && parentTask.assignedToNames) {
        // Filtrar asignados por área (necesitamos los datos de usuarios)
        // Por ahora asignamos la subtarea sin asignados específicos
        // El secretario de cada área deberá asignarla
      }
      
      const subtaskData = {
        title: `[${area}] ${parentTask.title}`,
        description: parentTask.description,
        status: 'pendiente',
        priority: parentTask.priority || 'media',
        area: area,
        areas: [area],
        parentTaskId: parentTaskId,
        parentTaskTitle: parentTask.title,
        isSubtask: true,
        isAreaSubtask: true, // Marca especial para subtareas de coordinación
        assignedTo: areaAssignees,
        assignedToNames: areaAssigneeNames,
        createdBy: parentTask.createdBy,
        createdByName: parentTask.createdByName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        dueDate: parentTask.dueDate,
        tags: parentTask.tags || [],
      };
      
      const subtaskRef = doc(tasksRef);
      batch.set(subtaskRef, subtaskData);
      subtasks.push({ id: subtaskRef.id, ...subtaskData });
    }
    
    // Actualizar tarea padre para marcarla como tarea de coordinación
    const parentRef = doc(db, 'tasks', parentTaskId);
    batch.update(parentRef, {
      isCoordinationTask: true,
      subtaskCount: areas.length,
      subtasksCompleted: 0,
      coordinationProgress: 0,
      updatedAt: Timestamp.now()
    });
    
    await batch.commit();
    
    return { 
      success: true, 
      subtasks,
      message: `Se crearon ${subtasks.length} subtareas para coordinación entre áreas`
    };
  } catch (error) {
    if (__DEV__) console.error('Error creando subtareas por área:', error);
    throw error;
  }
};

/**
 * Obtener subtareas de una tarea padre
 * @param {string} parentTaskId - ID de la tarea padre
 * @returns {Promise<Array>}
 */
export const getAreaSubtasks = async (parentTaskId) => {
  try {
    const q = query(
      collection(db, 'tasks'),
      where('parentTaskId', '==', parentTaskId),
      where('isAreaSubtask', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo subtareas:', error);
    return [];
  }
};

/**
 * Suscribirse a cambios en subtareas de una tarea padre (tiempo real)
 * @param {string} parentTaskId - ID de la tarea padre
 * @param {function} callback - Función a llamar con las subtareas actualizadas
 * @returns {function} unsubscribe
 */
export const subscribeToAreaSubtasks = (parentTaskId, callback) => {
  const q = query(
    collection(db, 'tasks'),
    where('parentTaskId', '==', parentTaskId),
    where('isAreaSubtask', '==', true)
  );
  
  return onSnapshot(q, (snapshot) => {
    const subtasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(subtasks);
  });
};

/**
 * Actualizar progreso de la tarea padre basado en subtareas
 * @param {string} parentTaskId - ID de la tarea padre
 */
export const updateParentTaskProgress = async (parentTaskId) => {
  try {
    const subtasks = await getAreaSubtasks(parentTaskId);
    
    if (subtasks.length === 0) return;
    
    const completedSubtasks = subtasks.filter(st => 
      st.status === 'completada' || st.status === 'en_revision'
    );
    
    const progress = Math.round((completedSubtasks.length / subtasks.length) * 100);
    const allCompleted = completedSubtasks.length === subtasks.length;
    
    const updateData = {
      subtasksCompleted: completedSubtasks.length,
      coordinationProgress: progress,
      updatedAt: Timestamp.now()
    };
    
    // Si todas las subtareas están completas, marcar la padre como en_revision
    if (allCompleted) {
      updateData.status = 'en_revision';
      updateData.allAreasCompletedAt = Timestamp.now();
    }
    
    await updateDoc(doc(db, 'tasks', parentTaskId), updateData);
    
    return {
      progress,
      completedCount: completedSubtasks.length,
      totalCount: subtasks.length,
      allCompleted
    };
  } catch (error) {
    if (__DEV__) console.error('Error actualizando progreso:', error);
    throw error;
  }
};

/**
 * Obtener resumen de progreso por área
 * @param {string} parentTaskId - ID de la tarea padre
 * @returns {Promise<Array<{area: string, status: string, assignees: Array, progress: number}>>}
 */
export const getAreaProgressSummary = async (parentTaskId) => {
  try {
    const subtasks = await getAreaSubtasks(parentTaskId);
    
    return subtasks.map(st => ({
      subtaskId: st.id,
      area: st.area,
      status: st.status,
      statusLabel: getStatusLabel(st.status),
      assignees: st.assignedToNames || st.assignedTo || [],
      isCompleted: st.status === 'completada' || st.status === 'en_revision',
      updatedAt: st.updatedAt
    }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo resumen de progreso:', error);
    return [];
  }
};

/**
 * Helper para obtener label de estado
 */
const getStatusLabel = (status) => {
  const labels = {
    'pendiente': '⏳ Pendiente',
    'en_proceso': '🔄 En Proceso',
    'en_revision': '👀 En Revisión',
    'completada': '✅ Completada',
    'bloqueada': '🚫 Bloqueada'
  };
  return labels[status] || status;
};

/**
 * Marcar subtarea de un área como completada
 * @param {string} subtaskId - ID de la subtarea
 * @param {object} user - Usuario que completa
 */
export const completeAreaSubtask = async (subtaskId, user) => {
  try {
    const subtaskRef = doc(db, 'tasks', subtaskId);
    
    await updateDoc(subtaskRef, {
      status: 'completada',
      completedBy: user.email,
      completedByName: user.displayName || user.email,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Obtener la subtarea para saber el parentTaskId
    const subtaskDoc = await getDoc(doc(db, 'tasks', subtaskId));

    if (subtaskDoc.exists()) {
      const subtask = subtaskDoc.data();
      if (subtask.parentTaskId) {
        // Actualizar progreso del padre
        await updateParentTaskProgress(subtask.parentTaskId);
      }
    }
    
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('Error completando subtarea:', error);
    throw error;
  }
};

export default {
  createAreaSubtasks,
  getAreaSubtasks,
  subscribeToAreaSubtasks,
  updateParentTaskProgress,
  getAreaProgressSummary,
  completeAreaSubtask
};
