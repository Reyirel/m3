// services/taskConfirmations.js
// Sistema de confirmación individual para tareas con múltiples asignados
// Cada asignado puede marcar su parte como completada

import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { toMs } from '../utils/dateUtils';
import { normalizeStatus, getAssignedEmails, getConfirmedEmails } from '../utils/taskHelpers';
import { db } from '../firebase';
import { updateParentTaskProgress } from './areaSubtasks';
import { getConnectionState, queueOperation, OPERATION_TYPES } from './offlineSync';

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

// Error de regla de negocio: reintentar no lo arregla, así que la cola sin conexión
// lo descarta en vez de reintentarlo (ver isPermanentError en offlineSync.js)
const preconditionError = (message) => {
  const error = new Error(message);
  error.code = 'failed-precondition';
  return error;
};

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
 * @param {object} [options]
 * @param {object} [options.task] - Tarea como se ve en pantalla (para el conteo cuando no hay conexión)
 * @param {boolean} [options.fromQueue] - true cuando la ejecuta la cola al recuperar la conexión
 * @returns {Promise<{success: boolean, allCompleted: boolean, completedCount: number, totalAssigned: number, queued?: boolean}>}
 */
export const confirmTaskCompletion = async (taskId, user, { task: localTask = null, fromQueue = false } = {}) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const userEmail = normalizeEmail(user.email);

    // Sin conexión: una transacción no puede ejecutarse. La confirmación se guarda en la
    // cola y se aplica al reconectar; mientras tanto la lista la muestra como pendiente.
    if (!fromQueue && !getConnectionState()) {
      const assignedTo = getAssignedEmails(localTask);
      if (localTask && !assignedTo.includes(userEmail)) {
        throw preconditionError('No estás asignado a esta tarea');
      }
      await queueOperation(
        OPERATION_TYPES.CONFIRM,
        { email: userEmail, displayName: user.displayName || user.email, area: user.area || '' },
        taskId,
        userEmail
      );
      const confirmed = getConfirmedEmails(localTask?.completedBy, assignedTo);
      confirmed.add(userEmail);
      return {
        success: true,
        queued: true,
        allCompleted: false,
        completedCount: confirmed.size,
        totalAssigned: assignedTo.length
      };
    }

    // Transacción: si dos asignados confirman al mismo tiempo, ninguna confirmación
    // se pierde y el paso a revisión se calcula con el estado real de la tarea.
    const result = await runTransaction(db, async (transaction) => {
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw preconditionError('Tarea no encontrada');
      }

      const task = taskSnap.data();
      const assignedTo = getAssignedEmails(task);
      const completedBy = task.completedBy || [];

      // Verificar que el usuario está asignado
      if (!assignedTo.includes(userEmail)) {
        throw preconditionError('No estás asignado a esta tarea');
      }

      if (normalizeStatus(task.status) === 'cerrada') {
        throw preconditionError('La tarea ya fue finalizada');
      }

      // Verificar si ya confirmó
      if (completedBy.some(c => normalizeEmail(c.email) === userEmail)) {
        throw preconditionError('Ya confirmaste tu parte de esta tarea');
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
 * Obtener métricas de cumplimiento por usuario
 * @param {Array} tasks - Lista de tareas
 * @param {string} userEmail - Email del usuario (opcional, si no se pasa retorna todas)
 * @returns {object} Métricas de cumplimiento
 */
export const getComplianceMetrics = (tasks, userEmail = null) => {
  const metrics = {};
  
  tasks.forEach(task => {
    // assignedTo puede ser un solo correo en tareas antiguas
    const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
    const completedBy = Array.isArray(task.completedBy) ? task.completedBy : [];

    assignedTo.forEach((email, index) => {
      const emailLower = normalizeEmail(email);
      if (!emailLower) return;
      
      // Si se especificó un usuario, filtrar
      if (userEmail && emailLower !== normalizeEmail(userEmail)) return;
      
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
      
      const confirmation = completedBy.find(c => normalizeEmail(c?.email) === emailLower);
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

