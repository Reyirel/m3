// services/pushNotifications.js
// Firebase Cloud Messaging (FCM) para push notifications en producción
// Para App Store y Play Store

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../firebase';
import { collection, addDoc, doc, getDocs, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';

const log = __DEV__ ? console.log : () => {};

/**
 * Obtener token de push notification del dispositivo
 * @returns {Promise<string>} FCM token o Expo push token
 */
export const getPushNotificationToken = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web no soporta push notifications igual
      console.warn('Push notifications not available on web');
      return null;
    }

    // Obtener token del proyecto Expo
    const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

    if (expoProjectId) {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: expoProjectId,
      });
      return token;
    } else {
      console.warn('Expo project ID not found');
      return null;
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Registrar token de push notification para el usuario
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const registerPushToken = async (userId) => {
  try {
    const token = await getPushNotificationToken();

    if (!token) {
      console.warn('No push token available');
      return;
    }

    // Guardar token en Firestore
    await addDoc(collection(db, 'user_push_tokens'), {
      userId,
      token,
      platform: Platform.OS,
      registeredAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    log('Push token registered:', token);
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};

/**
 * Enviar push notification a un usuario
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - { title, body, data? }
 * @returns {Promise<void>}
 */
export const sendPushNotification = async (userId, notification) => {
  try {
    // Guardar en historial (para usar después con FCM backend)
    await addDoc(collection(db, 'push_notifications_queue'), {
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

/**
 * Configurar handler para push notifications
 * @param {Function} onNotificationReceived - Callback cuando notificación llega
 * @returns {Function} Unsubscribe function
 */
export const setupPushNotificationListener = (onNotificationReceived) => {
  // Listener para notificaciones cuando app está en foreground
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { notification } = response;
    const { data } = notification.request.content;

    // Handle notificación
    if (onNotificationReceived) {
      onNotificationReceived({
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: data || {},
      });
    }

    // Navegar basado en tipo de notificación
    if (data?.taskId) {
      // Navegar a tarea
      log('Navigate to task:', data.taskId);
    } else if (data?.areaId) {
      // Navegar a área
      log('Navigate to area:', data.areaId);
    }
  });

  return () => subscription.remove();
};

/**
 * Batch send push notifications
 * @param {Array<string>} userIds - Array de user IDs
 * @param {Object} notification - Notification data
 * @returns {Promise<void>}
 */
export const batchSendPushNotifications = async (userIds = [], notification) => {
  try {
    const promises = userIds.map((userId) =>
      sendPushNotification(userId, notification)
    );

    await Promise.all(promises);
    log(`Sent notifications to ${userIds.length} users`);
  } catch (error) {
    console.error('Error batch sending notifications:', error);
  }
};

/**
 * Crear notificación para asignación de tarea
 * @param {string} taskId - Task ID
 * @param {string} taskTitle - Task title
 * @param {Array<string>} assignedUserIds - User IDs to notify
 * @param {string} assignedBy - User who assigned
 * @returns {Promise<void>}
 */
export const notifyTaskAssignment = async (taskId, taskTitle, assignedUserIds = [], assignedBy) => {
  try {
    const notification = {
      title: '📋 Nueva Tarea Asignada',
      body: taskTitle,
      data: {
        type: 'task_assigned',
        taskId,
        assignedBy,
      },
    };

    await batchSendPushNotifications(assignedUserIds, notification);
  } catch (error) {
    console.error('Error notifying task assignment:', error);
  }
};

/**
 * Crear notificación para completación de subtarea
 * @param {string} taskId - Task ID
 * @param {string} subtaskTitle - Subtask title
 * @param {Array<string>} teamMemberIds - Team members to notify
 * @param {string} completedBy - User who completed
 * @returns {Promise<void>}
 */
export const notifySubtaskCompletion = async (taskId, subtaskTitle, teamMemberIds = [], completedBy) => {
  try {
    const notification = {
      title: '✅ Subtarea Completada',
      body: subtaskTitle,
      data: {
        type: 'subtask_completed',
        taskId,
        completedBy,
      },
    };

    await batchSendPushNotifications(teamMemberIds, notification);
  } catch (error) {
    console.error('Error notifying subtask completion:', error);
  }
};

/**
 * Crear notificación de urgencia (fecha próxima)
 * @param {string} taskId - Task ID
 * @param {string} taskTitle - Task title
 * @param {string} responsibleUserId - User responsible
 * @param {number} hoursUntilDue - Hours until due
 * @returns {Promise<void>}
 */
export const notifyTaskDueSOON = async (taskId, taskTitle, responsibleUserId, hoursUntilDue) => {
  try {
    const notification = {
      title: '⏰ Tarea Vence Pronto',
      body: `${taskTitle} (en ${hoursUntilDue} horas)`,
      data: {
        type: 'task_due_soon',
        taskId,
        hoursUntilDue,
      },
    };

    await sendPushNotification(responsibleUserId, notification);
  } catch (error) {
    console.error('Error notifying task due soon:', error);
  }
};

/**
 * Enviar notificación de reporte
 * @param {string} reportId - Report ID
 * @param {string} taskId - Task ID
 * @param {string} reportTitle - Report title
 * @param {Array<string>} reviewerIds - Users to notify
 * @param {string} submittedBy - User who submitted
 * @returns {Promise<void>}
 */
export const notifyNewReport = async (reportId, taskId, reportTitle, reviewerIds = [], submittedBy) => {
  try {
    const notification = {
      title: '📸 Nuevo Reporte Enviado',
      body: reportTitle,
      data: {
        type: 'report_submitted',
        taskId,
        reportId,
        submittedBy,
      },
    };

    await batchSendPushNotifications(reviewerIds, notification);
  } catch (error) {
    console.error('Error notifying new report:', error);
  }
};

/**
 * Enviar notificación de calificación de reporte
 * @param {string} reportId - Report ID
 * @param {string} taskId - Task ID
 * @param {number} rating - Rating (1-5)
 * @param {string} submitterId - User who submitted report
 * @param {string} ratedBy - User who rated
 * @returns {Promise<void>}
 */
export const notifyReportRated = async (reportId, taskId, rating, submitterId, ratedBy) => {
  try {
    const notification = {
      title: '⭐ Tu Reporte fue Calificado',
      body: `Calificación: ${rating}/5 estrellas`,
      data: {
        type: 'report_rated',
        taskId,
        reportId,
        rating,
        ratedBy,
      },
    };

    await sendPushNotification(submitterId, notification);
  } catch (error) {
    console.error('Error notifying report rated:', error);
  }
};

/**
 * Clean up expired push tokens
 * @returns {Promise<number>} Number of tokens removed
 */
export const cleanupExpiredTokens = async () => {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'user_push_tokens'),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);
    let deleted = 0;

    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, 'user_push_tokens', docSnapshot.id));
      deleted++;
    }

    log(`Cleaned up ${deleted} expired tokens`);
    return deleted;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return 0;
  }
};

/**
 * Schedule push notification to be sent later
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 * @param {Date} sendAt - When to send
 * @returns {Promise<void>}
 */
export const schedulePushNotification = async (userId, notification, sendAt) => {
  try {
    await addDoc(collection(db, 'scheduled_notifications'), {
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      scheduleAt: sendAt,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    log('Notification scheduled for:', sendAt);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};
