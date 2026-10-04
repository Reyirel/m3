// services/pushNotifications.js
// Firebase Cloud Messaging (FCM) para push notifications en producción
// Para App Store y Play Store

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const log = __DEV__ ? console.log : () => {};

/**
 * Obtener token de push notification del dispositivo
 * @returns {Promise<string>} FCM token o Expo push token
 */
export const getPushNotificationToken = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web no soporta push notifications igual
      if (__DEV__) console.warn('Push notifications not available on web');
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
      if (__DEV__) console.warn('Expo project ID not found');
      return null;
    }
  } catch (error) {
    if (__DEV__) console.error('Error getting push token:', error);
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
      if (__DEV__) console.warn('No push token available');
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
    if (__DEV__) console.error('Error registering push token:', error);
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
    if (__DEV__) console.error('Error sending push notification:', error);
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
    if (__DEV__) console.error('Error batch sending notifications:', error);
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
    if (__DEV__) console.error('Error notifying subtask completion:', error);
  }
};

