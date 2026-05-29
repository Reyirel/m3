// services/taskProgress.js
// Servicio para calcular progreso de tareas en tiempo real
// Soporta múltiples asignados y subtareas

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';

const TASKS_COLLECTION = 'tasks';
const SUBTASKS_SUBCOLLECTION = 'subtasks';

/**
 * Calcular progreso de una tarea en tiempo real
 * @param {string} taskId - ID de la tarea
 * @param {Function} callback - Recibe objeto con progreso
 * @returns {Function} Unsubscribe
 */
export function subscribeToTaskProgress(taskId, callback) {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const subtasksRef = collection(db, TASKS_COLLECTION, taskId, SUBTASKS_SUBCOLLECTION);

    // Obtener datos de la tarea una sola vez (no en tiempo real).
    // Solo las subtareas necesitan live updates para el progreso.
    let cachedTaskData = null;

    const unsubscribe = onSnapshot(subtasksRef, async (subtasksSnap) => {
      if (!cachedTaskData) {
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) { callback(null); return; }
        cachedTaskData = taskSnap.data();
      }

      const subtasks = subtasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(calculateProgress(cachedTaskData, subtasks));
    });

    return unsubscribe;
  } catch (error) {
    if (__DEV__) console.error('Error en subscribeToTaskProgress:', error);
    return () => {};
  }
}

/**
 * Calcular progreso basado en subtareas y asignados
 * @param {Object} taskData - Datos de la tarea
 * @param {Array} subtasks - Array de subtareas
 * @returns {Object} Objeto con progreso detallado
 */
function calculateProgress(taskData, subtasks) {
  const assignees = taskData.assignedTo || [];
  const _assignments = taskData.assignments || [];

  // 1. Progreso general (basado en subtareas completadas)
  let overallProgress = 0;
  if (subtasks.length > 0) {
    const completedSubtasks = subtasks.filter(s => s.status === 'completada').length;
    overallProgress = Math.round((completedSubtasks / subtasks.length) * 100);
  }

  // 2. Progreso por asignado
  const progressByAssignee = {};
  assignees.forEach(email => {
    // Subtareas asignadas a este email
    const subtasksByAssignee = subtasks.filter(s => s.assignedTo === email);
    
    if (subtasksByAssignee.length > 0) {
      const completed = subtasksByAssignee.filter(s => s.status === 'completada').length;
      const percentage = Math.round((completed / subtasksByAssignee.length) * 100);
      
      progressByAssignee[email] = {
        total: subtasksByAssignee.length,
        completed: completed,
        percentage: percentage,
        status: completed === 0 ? 'no-iniciada' : completed === subtasksByAssignee.length ? 'completada' : 'en-progreso'
      };
    } else {
      progressByAssignee[email] = {
        total: 0,
        completed: 0,
        percentage: 0,
        status: 'sin-tareas'
      };
    }
  });

  // 3. Estadísticas de subtareas
  const subtaskStats = {
    total: subtasks.length,
    completada: subtasks.filter(s => s.status === 'completada').length,
    en_proceso: subtasks.filter(s => s.status === 'en_proceso').length,
    en_revision: subtasks.filter(s => s.status === 'en_revision').length,
    pendiente: subtasks.filter(s => s.status === 'pendiente').length
  };

  // 4. Próxima subtarea pendiente
  const nextPending = subtasks.find(s => s.status === 'pendiente');

  // 5. Última actividad (basada en updatedAt más reciente)
  let lastActivity = null;
  if (subtasks.length > 0) {
    const sorted = [...subtasks].sort((a, b) => {
      const aTime = toMs(a.updatedAt) || 0;
      const bTime = toMs(b.updatedAt) || 0;
      return bTime - aTime;
    });
    lastActivity = sorted[0];
  }

  return {
    overallProgress,
    progressByAssignee,
    subtaskStats,
    nextPending,
    lastActivity,
    subtasks,
    isComplete: overallProgress === 100,
    estimatedCompletion: taskData.dueAt
  };
}

/**
 * Obtener progreso de una tarea sin tiempo real (one-time)
 * @param {string} taskId 
 * @returns {Promise<Object>} Objeto con progreso
 */
export async function getTaskProgress(taskId) {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) return null;

    const taskData = taskSnap.data();

    // Obtener subtareas
    const subtasksRef = collection(db, TASKS_COLLECTION, taskId, SUBTASKS_SUBCOLLECTION);
    const subtasksSnap = await getDocs(subtasksRef);
    const subtasks = subtasksSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return calculateProgress(taskData, subtasks);
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo progreso:', error);
    return null;
  }
}

/**
 * Obtener progreso de múltiples tareas (para dashboards)
 * @param {Array} taskIds - Array de IDs de tareas
 * @param {Function} callback - Callback que recibe array de progresos
 * @returns {Function} Unsubscribe
 */
/**
 * Suscribirse a progreso de múltiples tareas
 * @param {Array} taskIds 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe
 */
export function subscribeToMultipleTasksProgress(taskIds, callback) {
  if (!taskIds || taskIds.length === 0) {
    callback({});
    return () => {};
  }

  const unsubscribers = [];
  const progressMap = {};
  let _activeSubscriptions = 0;

  // Suscribir a cada tarea
  taskIds.forEach(taskId => {
    const unsub = subscribeToTaskProgress(taskId, (progressData) => {
      if (progressData) {
        progressMap[taskId] = progressData;
        _activeSubscriptions = Object.keys(progressMap).length;
      } else {
        delete progressMap[taskId];
        _activeSubscriptions = Object.keys(progressMap).length;
      }
      
      // Enviar mapa actualizado (más eficiente que array)
      callback(progressMap);
    });

    if (typeof unsub === 'function') {
      unsubscribers.push(unsub);
    }
  });

  // Retornar unsubscribe general
  return () => {
    unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') {
        try {
          unsub();
        } catch (e) {
          if (__DEV__) console.warn('Error al desuscribir:', e);
        }
      }
    });
    unsubscribers.length = 0;
  };
}

/**
 * Obtener estado de salud de un proyecto (RED/AMBER/GREEN)
 * Basado en: tiempo restante vs % completado
 */
export function getProjectHealth(progressData) {
  if (!progressData) return 'gray';

  const { overallProgress, estimatedCompletion } = progressData;
  const now = Date.now();
  const daysRemaining = (estimatedCompletion - now) / (1000 * 60 * 60 * 24);
  
  // Criterios:
  // GREEN: 80%+ completado O aún hay mucho tiempo
  // AMBER: 40-79% completado Y tiempo se agota
  // RED: < 40% completado Y poco tiempo

  if (overallProgress >= 80) return 'green';
  if (overallProgress >= 40 && daysRemaining < 7) return 'amber';
  if (overallProgress < 40 && daysRemaining < 7) return 'red';
  
  return 'green';
}

export default {
  subscribeToTaskProgress,
  subscribeToMultipleTasksProgress,
  getTaskProgress,
  getProjectHealth,
  calculateProgress
};
