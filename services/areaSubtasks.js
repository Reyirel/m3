// services/areaSubtasks.js
// Sistema de subtareas automáticas por área
// Cuando una tarea se asigna a múltiples áreas, se crean subtareas coordinadas

import { collection, doc, getDoc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';
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
const getParentAreas = (parentTask) =>
  [...new Set(Array.isArray(parentTask?.areas) ? parentTask.areas.filter(Boolean) : [])];

// Documento de la subtarea de un área
const buildAreaSubtask = (area, parentTask, parentTaskId) => ({
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

export const addAreaSubtasksToBatch = (batch, parentTask, parentTaskId) => {
  const areas = getParentAreas(parentTask);
  if (areas.length <= 1) return 0;

  const tasksRef = collection(db, 'tasks');
  areas.forEach((area) => {
    batch.set(doc(tasksRef), buildAreaSubtask(area, parentTask, parentTaskId));
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
 * Ajusta las subtareas por área después de que el administrador cambia las áreas de una
 * tarea ya creada (al crearla se usa addAreaSubtasksToBatch):
 *   - un área nueva recibe su subtarea
 *   - la subtarea de un área quitada va a la papelera (areaRemoved: true), no se borra:
 *     conserva su avance y su chat, y no regresa si después se restaura la tarea principal
 *   - si la tarea queda con una sola área deja de ser de coordinación
 *
 * @param {string} parentTaskId - ID de la tarea principal
 * @param {object} parentTask - Datos de la tarea ya actualizados (title, areas, dueAt…)
 * @param {string} [removedBy] - Correo de quien hizo el cambio
 * @returns {Promise<{added: number, removed: number}>}
 */
export const syncAreaSubtasksAfterEdit = async (parentTaskId, parentTask, removedBy = '') => {
  const areas = getParentAreas(parentTask);
  const isCoordination = areas.length > 1;
  const current = (await getAreaSubtasks(parentTaskId)).filter(st => !st.deleted);
  const currentAreas = new Set(current.map(st => st.area));

  const toAdd = isCoordination ? areas.filter(area => !currentAreas.has(area)) : [];
  const keep = new Set(isCoordination ? areas : []);
  const toRemove = current.filter(st => !keep.has(st.area));
  if (toAdd.length === 0 && toRemove.length === 0) return { added: 0, removed: 0 };

  const batch = writeBatch(db);
  const tasksRef = collection(db, 'tasks');
  toAdd.forEach(area => batch.set(doc(tasksRef), buildAreaSubtask(area, parentTask, parentTaskId)));
  toRemove.forEach(st => batch.update(doc(db, 'tasks', st.id), {
    deleted: true,
    deletedBy: removedBy,
    deletedAt: serverTimestamp(),
    areaRemoved: true,
  }));
  batch.update(doc(db, 'tasks', parentTaskId), isCoordination
    ? { isCoordinationTask: true, subtaskCount: areas.length }
    : { isCoordinationTask: false, subtaskCount: 0, subtasksCompleted: 0, coordinationProgress: 0 });
  await batch.commit();

  if (isCoordination) await updateParentTaskProgress(parentTaskId);
  return { added: toAdd.length, removed: toRemove.length };
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
