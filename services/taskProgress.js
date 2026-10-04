// services/taskProgress.js
// Servicio para calcular progreso de tareas en tiempo real
// Soporta múltiples asignados y subtareas

import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
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
 * Obtener progreso de múltiples tareas (para dashboards)
 * @param {Array} taskIds - Array de IDs de tareas
 * @param {Function} callback - Callback que recibe array de progresos
 * @returns {Function} Unsubscribe
 */
