// services/notificationsLive.js
// Notificaciones en tiempo real mientras la app está abierta:
//   - contador de no leídas para la campana (antes solo se calculaba una vez al abrir Inicio)
//   - aviso en pantalla cuando llega una notificación nueva
//   - en web, aviso del navegador si la pestaña está en segundo plano y hay permiso

import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';

/**
 * Lista de notificaciones del usuario en tiempo real (de la más reciente a la más antigua).
 * @param {string} userId
 * @param {Function} callback - Recibe la lista cada vez que cambia
 * @param {Function} [onError]
 * @returns {Function} Función para cancelar la suscripción
 */
export const subscribeToMyNotifications = (userId, callback, onError) => {
  if (!userId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', userId)),
    (snapshot) => {
      const notifications = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => !n.deleted)
        .sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0));
      callback(notifications);
    },
    onError
  );
};

// Un lote de Firestore admite 500 operaciones
const inBatches = async (ids, fields) => {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => batch.update(doc(db, 'notifications', id), fields));
    await batch.commit();
  }
};

/** Marcar varias notificaciones como leídas en una sola operación */
export const markNotificationsRead = (ids) =>
  inBatches(ids, { read: true, readAt: serverTimestamp() });

/** Eliminar varias notificaciones (se marcan como eliminadas; no se borran de la base) */
export const deleteNotifications = (ids) =>
  inBatches(ids, { deleted: true, deletedAt: serverTimestamp() });

let unreadCount = 0;
let countListeners = [];

const setUnreadCount = (count) => {
  unreadCount = count;
  countListeners.forEach(listener => listener(count));
};

/** Suscribirse al contador de no leídas (devuelve la función para cancelar) */
export const subscribeToUnreadCount = (listener) => {
  countListeners.push(listener);
  listener(unreadCount);
  return () => {
    countListeners = countListeners.filter(l => l !== listener);
  };
};

/** ¿El navegador puede mostrar notificaciones del sistema y ya dio permiso? */
const canUseBrowserNotifications = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;

/** Pedir permiso al navegador para mostrar notificaciones (solo web; debe iniciarlo el usuario) */
export const requestBrowserNotificationPermission = async () => {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (window.Notification.permission !== 'default') return window.Notification.permission;
  try {
    return await window.Notification.requestPermission();
  } catch (_e) {
    return 'denied';
  }
};

const showBrowserNotification = (notification) => {
  if (!canUseBrowserNotifications() || window.Notification.permission !== 'granted') return;
  // Con la pestaña visible basta el aviso dentro de la app
  if (typeof document !== 'undefined' && !document.hidden) return;
  try {
    const item = new window.Notification(notification.title || 'Nueva notificación', {
      body: notification.body || notification.message || '',
      icon: '/icon-192.png',
      tag: notification.id,
    });
    item.onclick = () => {
      window.focus();
      item.close();
    };
  } catch (_e) {
    // Algunos navegadores móviles solo permiten notificaciones desde el service worker
  }
};

/**
 * Vigilar las notificaciones no leídas de un usuario.
 * @param {string} userId - ID del usuario (campo userId de las notificaciones)
 * @param {Function} onNew - Se llama con cada notificación que llega después de abrir la app
 * @returns {Function} Función para dejar de vigilar
 */
export const watchNotifications = (userId, onNew) => {
  if (!userId) return () => {};

  const unreadQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );

  // El primer resultado trae las que ya existían: esas no se anuncian como nuevas
  let isFirstSnapshot = true;

  const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
    setUnreadCount(snapshot.docs.filter(d => !d.data().deleted).length);

    if (!isFirstSnapshot) {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added' || change.doc.data().deleted) return;
        const notification = { id: change.doc.id, ...change.doc.data() };
        onNew?.(notification);
        showBrowserNotification(notification);
      });
    }
    isFirstSnapshot = false;
  }, (error) => {
    if (__DEV__) console.error('Error vigilando notificaciones:', error);
  });

  return () => {
    unsubscribe();
    setUnreadCount(0);
  };
};
