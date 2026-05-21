// services/taskConfirmations.js
// Sistema de confirmación individual para tareas con múltiples asignados
// Cada asignado puede marcar su parte como completada

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from 'firebase/firestore';
import { toMs } from '../utils/dateUtils';
import { db } from '../firebase';

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
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Tarea no encontrada');
    }
    
    const task = taskSnap.data();
    const assignedTo = task.assignedTo || [];
    const completedBy = task.completedBy || [];
    
    // Verificar que el usuario está asignado
    const userEmail = user.email?.toLowerCase().trim() || '';
    if (!assignedTo.some(e => e?.toLowerCase().trim() === userEmail)) {
      throw new Error('No estás asignado a esta tarea');
    }
    
    // Verificar si ya confirmó
    const alreadyConfirmed = completedBy.some(c => c.email?.toLowerCase().trim() === userEmail);
    if (alreadyConfirmed) {
      throw new Error('Ya confirmaste tu parte de esta tarea');
    }
    
    // Crear confirmación
    const confirmation = {
      email: userEmail,
      displayName: user.displayName || user.email,
      area: user.area || '',
      completedAt: Timestamp.now()
    };
    
    // Actualizar tarea
    const newCompletedBy = [...completedBy, confirmation];
    const allCompleted = newCompletedBy.length >= assignedTo.length;
    
    const updateData = {
      completedBy: arrayUnion(confirmation),
      updatedAt: Timestamp.now()
    };
    
    // Si todos completaron, cambiar estado a "en_revision" para que admin valide
    if (allCompleted) {
      updateData.status = 'en_revision';
      updateData.allCompletedAt = Timestamp.now();
    }
    
    await updateDoc(taskRef, updateData);
    
    return {
      success: true,
      allCompleted,
      completedCount: newCompletedBy.length,
      totalAssigned: assignedTo.length
    };
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
    const confirmationToRemove = completedBy.find(c => c.email.toLowerCase() === userEmail.toLowerCase());
    
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
    const assignedTo = task.assignedTo || [];
    const assignedToNames = task.assignedToNames || [];
    const completedBy = task.completedBy || [];
    
    // Construir lista de asignados con su estado
    const assignees = assignedTo.map((email, index) => {
      const confirmation = completedBy.find(c => c.email.toLowerCase() === email.toLowerCase());
      return {
        email,
        displayName: assignedToNames[index] || email,
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
  return task.completedBy.some(c => c.email.toLowerCase() === userEmail.toLowerCase());
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
