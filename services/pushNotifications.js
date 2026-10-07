// services/pushNotifications.js
// Notificaciones push en la app nativa (Android / iOS).
//
// La app registra aquí el token de Expo de este dispositivo. La Cloud Function
// onNotificationCreated (firebase-functions/index.js) envía por push cada aviso que se
// guarda en la colección `notifications`.
//
// Requisitos para que funcione:
//   - EAS_PROJECT_ID definido al compilar (app.config.js → extra.eas.projectId)
//   - las Cloud Functions desplegadas
// En web no hay push: los avisos llegan en tiempo real mientras la app está abierta
// (services/notificationsLive.js).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const log = __DEV__ ? console.log : () => {};

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días; se renueva cada vez que se abre la app

/**
 * Obtener token de push notification del dispositivo
 * @returns {Promise<string|null>} Token de Expo, o null si no está disponible
 */
const getPushNotificationToken = async () => {
  try {
    if (Platform.OS === 'web') {
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

// Un documento por dispositivo, identificado por su token. Antes se agregaba un documento
// nuevo cada vez que se abría la app, y el mismo aviso llegaba repetido.
const tokenDocRef = (token) => doc(db, 'user_push_tokens', token.replace(/[^A-Za-z0-9_-]/g, '_'));

/**
 * Registrar el token de este dispositivo a nombre del usuario
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

    // Si otra persona usó antes este dispositivo, el token pasa a quien tiene la sesión
    await setDoc(tokenDocRef(token), {
      userId,
      token,
      platform: Platform.OS,
      registeredAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    log('Push token registered:', token);
  } catch (error) {
    if (__DEV__) console.error('Error registering push token:', error);
  }
};

/**
 * Dar de baja el token de este dispositivo. Se llama al cerrar sesión, para que los avisos
 * de esa cuenta no sigan llegando a un dispositivo donde ya no tiene la sesión abierta.
 * Nunca lanza error: no debe impedir el cierre de sesión.
 * @returns {Promise<void>}
 */
export const unregisterPushToken = async () => {
  try {
    const token = await getPushNotificationToken();
    if (token) await deleteDoc(tokenDocRef(token));
  } catch (error) {
    if (__DEV__) console.error('Error unregistering push token:', error);
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
