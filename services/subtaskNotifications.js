// services/subtaskNotifications.js
// Notificaciones cuando se completa una subtarea
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const TASKS_COLLECTION = 'tasks';
const USERS_COLLECTION = 'users';

/**
 * Notificar a los asignados cuando se completa una subtarea
 * @param {string} taskId - ID de la tarea
 * @param {string} subtaskId - ID de la subtarea
 * @param {string} completedBy - Email del usuario que completó
 * @param {object} subtask - Datos de la subtarea completada
 */
export async function notifySubtaskCompletion(taskId, subtaskId, completedBy, subtask) {
  try {
    // Obtener datos de la tarea
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      console.warn('Task not found:', taskId);
      return;
    }

    const task = {
      id: taskSnap.id,
      ...taskSnap.data()
    };

    // Obtener quién completó
    const completedByUser = await getUserDisplayName(completedBy);
    
    // Construir mensaje
    const title = '✅ Subtarea Completada';
    const message = `${completedByUser.displayName || completedBy} completó "${subtask.title}" en "${task.title}"`;
    
    // Determinar a quién notificar
    const notifyEmails = [];
    
    // Agregar al creador si existe
    if (task.createdBy && task.createdBy !== completedBy) {
      notifyEmails.push(task.createdBy);
    }
    
    // Agregar a otros asignados (si hay múltiples asignados)
    if (Array.isArray(task.assignedTo)) {
      // assignedTo es un array de objetos {email, displayName}
      task.assignedTo.forEach(assignee => {
        const email = assignee.email || assignee;
        if (email !== completedBy && !notifyEmails.includes(email)) {
          notifyEmails.push(email);
        }
      });
    } else if (typeof task.assignedTo === 'string' && task.assignedTo !== completedBy) {
      // Backwards compatibility para tareas antiguas
      notifyEmails.push(task.assignedTo);
    }

    // Enviar notificaciones locales (si está en app)
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: message,
            data: {
              taskId: taskId,
              subtaskId: subtaskId,
              type: 'subtask_completion',
              taskTitle: task.title,
              subtaskTitle: subtask.title,
              completedBy: completedBy
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            color: '#10B981', // Verde para completado
          },
          trigger: { seconds: 1 }
        });
      } catch (error) {
        console.warn('Error scheduling local notification:', error);
      }
    }

    // Email notifications via server-side service (not yet configured)

  } catch (error) {
    console.error('Error notifying subtask completion:', error);
  }
}

/**
 * Obtener nombre de usuario por email
 * @param {string} email 
 * @returns {object} { displayName, email }
 */
async function getUserDisplayName(email) {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return {
        displayName: userData.displayName || userData.email,
        email: email,
        role: userData.role
      };
    }
    
    return { displayName: email, email };
  } catch (error) {
    console.warn('Error getting user display name:', error);
    return { displayName: email, email };
  }
}


/**
 * Notificar cuando una tarea cambia de estado
 * @param {string} taskId 
 * @param {string} oldStatus 
 * @param {string} newStatus 
 * @param {string} changedBy 
 * @param {object} task 
 */
export async function notifyTaskStatusChange(taskId, oldStatus, newStatus, changedBy, task) {
  try {
    const changedByUser = await getUserDisplayName(changedBy);
    
    let title = '';

    if (newStatus === 'cerrada' || newStatus === 'completada') {
      title = '✅ Tarea Completada';
    } else if (newStatus === 'en_proceso') {
      title = '🚀 Tarea en Progreso';
    } else if (newStatus === 'pendiente') {
      title = '⏳ Tarea Pendiente';
    } else if (newStatus === 'revisada' || newStatus === 'en_revison') {
      title = '👀 Tarea en Revisión';
    }
    
    const message = `${changedByUser.displayName || changedBy} cambió el estado de "${task.title}" a ${newStatus}`;
    
    // Notificación local
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: message,
            data: {
              taskId: taskId,
              type: 'task_status_change',
              oldStatus: oldStatus,
              newStatus: newStatus,
              changedBy: changedBy
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
            color: '#3B82F6',
          },
          trigger: { seconds: 1 }
        });
      } catch (error) {
        console.warn('Error scheduling task status notification:', error);
      }
    }
  } catch (error) {
    console.error('Error notifying task status change:', error);
  }
}
