// services/taskConfirmations.js
// Sistema de confirmación individual para tareas con múltiples asignados
// Cada asignado puede marcar su parte como completada

import { doc, updateDoc, arrayRemove, getDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { toMs } from '../utils/dateUtils';
import { normalizeStatus, getAssignedEmails, getConfirmedEmails } from '../utils/taskHelpers';
import { db } from '../firebase';
import { updateParentTaskProgress } from './areaSubtasks';

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

/**
 * Estructura de confirmación:
 * {
 *   email: string,
 *   displayName: string,
 *   completedAt: timestamp,
 *   area: string (opcional)
 * }
 */

/**
 * Marcar la parte de un usuario como completada
 * @param {string} taskId - ID de la tarea
 * @param {object} user - Usuario que confirma {email, displayName, area}
 * @returns {Promise<{success: boolean, allCompleted: boolean, completedCount: number, totalAssigned: number}>}
 */
export const confirmTaskCompletion = async (taskId, user) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const userEmail = normalizeEmail(user.email);

    // Transacción: si dos asignados confirman al mismo tiempo, ninguna confirmación
    // se pierde y el paso a revisión se calcula con el estado real de la tarea.
    const result = await runTransaction(db, async (transaction) => {
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('Tarea no encontrada');
      }

      const task = taskSnap.data();
      const assignedTo = getAssignedEmails(task);
      const completedBy = task.completedBy || [];

      // Verificar que el usuario está asignado
      if (!assignedTo.includes(userEmail)) {
        throw new Error('No estás asignado a esta tarea');
      }

      if (normalizeStatus(task.status) === 'cerrada') {
        throw new Error('La tarea ya fue finalizada');
      }

      // Verificar si ya confirmó
      if (completedBy.some(c => normalizeEmail(c.email) === userEmail)) {
        throw new Error('Ya confirmaste tu parte de esta tarea');
      }

      const confirmation = {
        email: userEmail,
        displayName: user.displayName || user.email,
        area: user.area || '',
        completedAt: Timestamp.now()
      };

      // Solo cuentan las confirmaciones de quienes siguen asignados: una confirmación
      // de alguien que ya no está en la tarea no sustituye la de un asignado actual.
      const newCompletedBy = [...completedBy, confirmation];
      const confirmedEmails = getConfirmedEmails(newCompletedBy, assignedTo);
      const allCompleted = confirmedEmails.size === assignedTo.length;

      const updateData = {
        completedBy: newCompletedBy,
        updatedAt: Timestamp.now()
      };

      // Si todos completaron, cambiar estado a "en_revision" para que admin valide
      if (allCompleted) {
        updateData.status = 'en_revision';
        updateData.allCompletedAt = Timestamp.now();
      }

      transaction.update(taskRef, updateData);

      return {
        success: true,
        allCompleted,
        completedCount: confirmedEmails.size,
        totalAssigned: assignedTo.length,
        parentTaskId: task.isAreaSubtask ? task.parentTaskId : null
      };
    });

    // Si era la subtarea de un área y pasó a revisión, actualizar el avance de la tarea principal
    const { parentTaskId, ...summary } = result;
    if (summary.allCompleted && parentTaskId) {
      updateParentTaskProgress(parentTaskId).catch(() => {});
    }

    return summary;
  } catch (error) {
    if (__DEV__) console.error('Error confirmando tarea:', error);
    throw error;
  }
};

/**
 * Quitar confirmación de un usuario (para correcciones)
 * @param {string} taskId - ID de la tarea
 * @param {string} userEmail - Email del usuario
 */
export const removeTaskConfirmation = async (taskId, userEmail) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Tarea no encontrada');
    }
    
    const task = taskSnap.data();
    const completedBy = task.completedBy || [];
    
    // Encontrar y remover la confirmación
    const confirmationToRemove = completedBy.find(c => normalizeEmail(c.email) === normalizeEmail(userEmail));
    
    if (!confirmationToRemove) {
      throw new Error('El usuario no ha confirmado esta tarea');
    }
    
    await updateDoc(taskRef, {
      completedBy: arrayRemove(confirmationToRemove),
      status: 'en_proceso', // Volver a en proceso
      updatedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('Error removiendo confirmación:', error);
    throw error;
  }
};

/**
 * Obtener estado de confirmaciones de una tarea
 * @param {string} taskId - ID de la tarea
 * @returns {Promise<{assignees: Array, confirmations: Array, pending: Array, progress: number}>}
 */
export const getTaskConfirmationStatus = async (taskId) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Tarea no encontrada');
    }
    
    const task = taskSnap.data();
    const assignedTo = getAssignedEmails(task);
    const assignments = task.assignments || [];
    const completedBy = task.completedBy || [];

    // Construir lista de asignados con su estado
    // (el nombre se busca por correo: assignedToNames puede no coincidir en orden tras una delegación)
    const assignees = assignedTo.map((email) => {
      const confirmation = completedBy.find(c => normalizeEmail(c.email) === email);
      const assignment = assignments.find(a => normalizeEmail(a.email) === email);
      return {
        email,
        displayName: assignment?.name || confirmation?.displayName || email,
        completed: !!confirmation,
        completedAt: confirmation?.completedAt || null
      };
    });
    
    const confirmed = assignees.filter(a => a.completed);
    const pending = assignees.filter(a => !a.completed);
    const progress = assignedTo.length > 0 ? Math.round((confirmed.length / assignedTo.length) * 100) : 0;
    
    return {
      assignees,
      confirmations: confirmed,
      pending,
      progress,
      allCompleted: pending.length === 0 && confirmed.length > 0
    };
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo estado de confirmaciones:', error);
    throw error;
  }
};

/**
 * Verificar si un usuario ya confirmó una tarea
 * @param {object} task - Objeto tarea con completedBy
 * @param {string} userEmail - Email del usuario
 * @returns {boolean}
 */
export const hasUserConfirmed = (task, userEmail) => {
  if (!task || !task.completedBy || !userEmail) return false;
  return task.completedBy.some(c => normalizeEmail(c.email) === normalizeEmail(userEmail));
};

/**
 * Obtener métricas de cumplimiento por usuario
 * @param {Array} tasks - Lista de tareas
 * @param {string} userEmail - Email del usuario (opcional, si no se pasa retorna todas)
 * @returns {object} Métricas de cumplimiento
 */
export const getComplianceMetrics = (tasks, userEmail = null) => {
  const metrics = {};
  
  tasks.forEach(task => {
    const assignedTo = task.assignedTo || [];
    const completedBy = task.completedBy || [];
    
    assignedTo.forEach((email, index) => {
      const emailLower = email.toLowerCase();
      
      // Si se especificó un usuario, filtrar
      if (userEmail && emailLower !== userEmail.toLowerCase()) return;
      
      if (!metrics[emailLower]) {
        metrics[emailLower] = {
          email: emailLower,
          displayName: task.assignedToNames?.[index] || email,
          assigned: 0,
          confirmed: 0,
          pending: 0,
          onTime: 0,
          late: 0,
          complianceRate: 0
        };
      }
      
      metrics[emailLower].assigned++;
      
      const confirmation = completedBy.find(c => c.email.toLowerCase() === emailLower);
      if (confirmation) {
        metrics[emailLower].confirmed++;
        
        // Verificar si fue a tiempo
        const dueAt = toMs(task.dueAt);
        const completedAt = toMs(confirmation.completedAt);
        
        if (dueAt && completedAt && completedAt <= dueAt) {
          metrics[emailLower].onTime++;
        } else if (dueAt && completedAt) {
          metrics[emailLower].late++;
        }
      } else if (task.status !== 'cerrada') {
        metrics[emailLower].pending++;
      }
    });
  });
  
  // Calcular tasas de cumplimiento
  Object.values(metrics).forEach(m => {
    m.complianceRate = m.assigned > 0 ? Math.round((m.confirmed / m.assigned) * 100) : 0;
    m.onTimeRate = m.confirmed > 0 ? Math.round((m.onTime / m.confirmed) * 100) : 0;
  });
  
  return metrics;
};

/**
 * Obtener métricas de cumplimiento por área
 * @param {Array} tasks - Lista de tareas
 * @param {Array} users - Lista de usuarios con sus áreas
 * @returns {object} Métricas por área
 */
export const getAreaComplianceMetrics = (tasks, users) => {
  const userMetrics = getComplianceMetrics(tasks);
  const areaMetrics = {};
  
  // Agrupar por área
  users.forEach(user => {
    const email = user.email.toLowerCase();
    const area = user.area || 'Sin área';
    const userMet = userMetrics[email];
    
    if (!userMet) return;
    
    if (!areaMetrics[area]) {
      areaMetrics[area] = {
        area,
        totalAssigned: 0,
        totalConfirmed: 0,
        totalPending: 0,
        totalOnTime: 0,
        totalLate: 0,
        users: []
      };
    }
    
    areaMetrics[area].totalAssigned += userMet.assigned;
    areaMetrics[area].totalConfirmed += userMet.confirmed;
    areaMetrics[area].totalPending += userMet.pending;
    areaMetrics[area].totalOnTime += userMet.onTime;
    areaMetrics[area].totalLate += userMet.late;
    areaMetrics[area].users.push(userMet);
  });
  
  // Calcular tasas por área
  Object.values(areaMetrics).forEach(area => {
    area.complianceRate = area.totalAssigned > 0 
      ? Math.round((area.totalConfirmed / area.totalAssigned) * 100) 
      : 0;
    area.onTimeRate = area.totalConfirmed > 0 
      ? Math.round((area.totalOnTime / area.totalConfirmed) * 100) 
      : 0;
  });
  
  return areaMetrics;
};

export default {
  confirmTaskCompletion,
  removeTaskConfirmation,
  getTaskConfirmationStatus,
  hasUserConfirmed,
  getComplianceMetrics,
  getAreaComplianceMetrics
};
