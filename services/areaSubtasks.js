// services/areaSubtasks.js
// Sistema de subtareas automáticas por área
// Cuando una tarea se asigna a múltiples áreas, se crean subtareas coordinadas

import { collection, doc, getDoc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeStatus } from '../utils/taskHelpers';
import { getSecretariasForAreas } from '../config/areas';

/**
 * Agrega a un lote las subtareas de una tarea con varias áreas (una por área) y marca
 * la tarea principal como tarea de coordinación.
 *
 * El lote debe incluir también la creación de la tarea principal: así la tarea y sus
 * subtareas se guardan juntas o no se guarda nada, y un reintento no las duplica.
 * Las subtareas nacen sin asignados: el secretario de cada área las asigna.
 *
 * @param {object} batch - Lote de Firestore (writeBatch)
 * @param {object} parentTask - Datos de la tarea principal
 * @param {string} parentTaskId - ID de la tarea principal
 * @returns {number} Subtareas agregadas (0 si la tarea tiene una sola área)
 */
export const addAreaSubtasksToBatch = (batch, parentTask, parentTaskId) => {
  const areas = Array.isArray(parentTask.areas) ? parentTask.areas.filter(Boolean) : [];
  if (areas.length <= 1) return 0;

  const tasksRef = collection(db, 'tasks');
  areas.forEach((area) => {
    batch.set(doc(tasksRef), {
      title: `[${area}] ${parentTask.title}`,
      description: parentTask.description,
      status: 'pendiente',
      priority: parentTask.priority || 'media',
      area,
      areas: [area],
      // Secretaría que puede ver la subtarea (visibilidad del secretario)
      secretarias: getSecretariasForAreas([area]),
      parentTaskId,
      parentTaskTitle: parentTask.title,
      isSubtask: true,
      isAreaSubtask: true, // Marca especial para subtareas de coordinación
      assignedTo: [],
      assignedToNames: [],
      assignments: [],
      createdBy: parentTask.createdBy,
      createdByName: parentTask.createdByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dueAt: parentTask.dueAt || null,
      tags: parentTask.tags || [],
      isCoordinationTask: false,
      progressPercentage: 0,
    });
  });

  batch.update(doc(db, 'tasks', parentTaskId), {
    isCoordinationTask: true,
    subtaskCount: areas.length,
    subtasksCompleted: 0,
    coordinationProgress: 0,
  });
  return areas.length;
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
    const subtasks = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(subtask => !subtask.deleted);
    callback(subtasks);
  }, (error) => {
    // Sin permiso para ver las subtareas de otras áreas: no se muestra el avance
    if (__DEV__) console.warn('Error en suscripción de subtareas por área:', error.message);
    callback([]);
  });
};

/**
 * Actualizar progreso de la tarea padre basado en subtareas
 * @param {string} parentTaskId - ID de la tarea padre
 */
export const updateParentTaskProgress = async (parentTaskId) => {
  try {
    const subtasks = (await getAreaSubtasks(parentTaskId)).filter(st => !st.deleted);

    if (subtasks.length === 0) return;

    // Un área terminó cuando su subtarea está en revisión o cerrada
    // ('completada' es la variante histórica de 'cerrada')
    const completedSubtasks = subtasks.filter(st =>
      ['en_revision', 'cerrada'].includes(normalizeStatus(st.status))
    );
    
    const progress = Math.round((completedSubtasks.length / subtasks.length) * 100);
    const allCompleted = completedSubtasks.length === subtasks.length;
    
    const updateData = {
      subtasksCompleted: completedSubtasks.length,
      coordinationProgress: progress,
      updatedAt: Timestamp.now()
    };
    
    // Si todas las áreas terminaron, la tarea principal pasa a revisión del administrador
    // (sin tocarla si el administrador ya la cerró)
    if (allCompleted) {
      const parentSnap = await getDoc(doc(db, 'tasks', parentTaskId));
      if (parentSnap.exists() && normalizeStatus(parentSnap.data().status) !== 'cerrada') {
        updateData.status = 'en_revision';
        updateData.allAreasCompletedAt = Timestamp.now();
      }
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
