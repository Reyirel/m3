// services/notificationsAdvanced.js
// Sistema avanzado de notificaciones (FCM + Local)
// Soporta tareas, subtareas, áreas, y eventos del sistema

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toMs } from '../utils/dateUtils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';

const log = __DEV__ ? console.log : () => {};

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_HISTORY_COLLECTION = 'notification_history';

/**
 * Configurar notificaciones
 */
export const configureNotifications = async () => {
  if (Platform.OS === 'web') return false;
  // Solicitar permisos
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    if (__DEV__) console.warn('Permisos de notificaciones denegados');
    return false;
  }

  // Configurar controlador de notificaciones
  Notifications.setNotificationHandler({
    handleNotification: async (_notification) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  return true;
};

/**
 * Enviar notificación local
 * @param {Object} options - { title, body, data?, delay? }
 */
export const sendLocalNotification = async (options) => {
  if (Platform.OS === 'web') return null;
  try {
    const { title, body, data = {}, delay = 1000 } = options;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
        data: {
          ...data,
          timestamp: Date.now(),
        },
      },
      trigger: { seconds: Math.ceil(delay / 1000) },
    });

    log('📲 Notificación local enviada:', notificationId);
    return notificationId;
  } catch (error) {
    if (__DEV__) console.error('Error en notificación local:', error);
    return null;
  }
};

/**
 * Notificación cuando se asigna una tarea
 * @param {Object} task - { id, title, assignedTo, area, priority }
 */
export const notifyTaskAssigned = async (task) => {
  try {
    const { title, area, priority } = task;
    const assignedEmails = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];

    for (const email of assignedEmails) {
      await recordNotification({
        type: 'task_assigned',
        title: `Nueva tarea asignada: ${title}`,
        body: `Área: ${area || 'Sin área'} • Prioridad: ${priority}`,
        userId: email,
        taskId: task.id,
        metadata: {
          taskTitle: title,
          area,
          priority,
        },
      });

      await sendLocalNotification({
        title: '📌 Nueva Tarea',
        body: `${title} ha sido asignada`,
        data: { taskId: task.id, type: 'task_assigned' },
      });
    }
  } catch (error) {
    if (__DEV__) console.error('Error notificando tarea asignada:', error);
  }
};

/**
 * Notificación para tareas próximas a vencer
 * @param {Object} task - { id, title, dueAt, area }
 */
export const notifyTaskDueSoon = async (task) => {
  try {
    const dueAtMs = toMs(task.dueAt);
    const daysLeft = Math.ceil((dueAtMs - Date.now()) / (1000 * 60 * 60 * 24));

    await recordNotification({
      type: 'task_due_soon',
      title: `⏰ Tarea próxima a vencer`,
      body: `"${task.title}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      taskId: task.id,
      metadata: {
        taskTitle: task.title,
        daysLeft,
      },
    });

    await sendLocalNotification({
      title: '⏰ Próx. a Vencer',
      body: `${task.title} - ${daysLeft}d`,
      data: { taskId: task.id, type: 'due_soon' },
    });
  } catch (error) {
    if (__DEV__) console.error('Error notificando vencimiento:', error);
  }
};

/**
 * Registrar notificación en BD (para historial)
 * @private
 */
const recordNotification = async (notification) => {
  try {
    const sessionResult = await getCurrentSession();
    const currentUserId = sessionResult.success ? sessionResult.session.userId : 'system';

    // Si no especifica userId, va a el usuario actual
    const userId = notification.userId || currentUserId;

    await addDoc(collection(db, NOTIFICATION_HISTORY_COLLECTION), {
      ...notification,
      userId,
      createdAt: serverTimestamp(),
      read: false,
      readAt: null,
    });
  } catch (error) {
    if (__DEV__) console.error('Error registrando notificación:', error);
  }
};

