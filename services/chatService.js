// services/chatService.js
// Chat de tareas: avisos a los demás participantes y control de mensajes no leídos.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, updateDoc,
} from 'firebase/firestore';
import { db, getServerTimestamp } from '../firebase';
import { toMs } from '../utils/dateUtils';
import { getAssignedEmails } from '../utils/taskHelpers';
import { getAllUsers } from './usersDirectory';

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

// ───────────────────────────── MENSAJES ─────────────────────────────

const messagesRef = (taskId) => collection(db, 'tasks', taskId, 'messages');

/** Datos de una tarea que no está entre las cargadas (null si no existe) */
export const getChatTask = async (taskId) => {
  const snapshot = await getDoc(doc(db, 'tasks', taskId));
  return snapshot.exists() ? snapshot.data() : null;
};

/**
 * Mensajes de una tarea en tiempo real, del más antiguo al más reciente.
 * Cada mensaje trae `_pending: true` mientras no lo confirma el servidor.
 * @returns {() => void} Función para dejar de escuchar
 */
export const subscribeToMessages = (taskId, callback, onError) => onSnapshot(
  query(messagesRef(taskId), orderBy('createdAt', 'asc')),
  // includeMetadataChanges: avisa también cuando un mensaje pasa de "enviando" a "enviado"
  { includeMetadataChanges: true },
  (snapshot) => callback(snapshot.docs.map((d) => ({
    id: d.id,
    // 'estimate': un mensaje aún sin confirmar muestra la hora local en vez de quedar sin hora
    ...d.data({ serverTimestamps: 'estimate' }),
    _pending: d.metadata.hasPendingWrites,
  }))),
  onError
);

/**
 * Guardar un mensaje y anotar en la tarea quién escribió por última vez.
 * La promesa se resuelve cuando el servidor confirma el mensaje; sin conexión queda
 * pendiente y el mensaje sale solo al recuperarla.
 * @param {string} taskId
 * @param {Object} message - { type: 'text', text } o { type: 'image', imageUrl, imageName }
 * @param {Object} sender - { userId, email, name }
 */
export const sendMessage = (taskId, message, sender) => {
  updateDoc(doc(db, 'tasks', taskId), {
    lastMessageAt: getServerTimestamp(),
    lastMessageBy: sender.name,
    lastMessageByEmail: sender.email || '',
  }).catch(() => {});

  return addDoc(messagesRef(taskId), {
    ...message,
    author: sender.name,
    authorId: sender.userId,
    authorEmail: sender.email || '',
    createdAt: getServerTimestamp(),
  });
};

/** Los últimos mensajes de una tarea, del más reciente al más antiguo */
export const getRecentMessages = async (taskId, count) => {
  const snapshot = await getDocs(query(messagesRef(taskId), orderBy('createdAt', 'desc'), limit(count)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ───────────────────────────── AVISOS ─────────────────────────────

// Un aviso por tarea por minuto como máximo: una conversación de diez mensajes
// seguidos no debe generar diez notificaciones a cada participante
const NOTIFY_INTERVAL_MS = 60 * 1000;
const lastNotifiedAt = new Map();

// La lista de usuarios se reutiliza unos minutos para no leerla en cada mensaje
const getUsers = () => getAllUsers();

/**
 * Participantes de la tarea que deben enterarse de un mensaje: los asignados y quien
 * la creó, menos quien escribe y las cuentas desactivadas.
 */
export const getChatRecipients = (task, users, sender) => {
  const assigned = getAssignedEmails(task);
  const createdBy = normalizeEmail(task?.createdBy);
  const senderEmail = normalizeEmail(sender?.email);

  return users.filter(user => {
    const email = normalizeEmail(user.email);
    if (!email || user.active === false) return false;
    if (email === senderEmail || (sender?.userId && user.id === sender.userId)) return false;
    // createdBy guarda el id del usuario (tareas nuevas) o su correo (tareas antiguas)
    return assigned.includes(email) || user.id === task?.createdBy || email === createdBy;
  });
};

/**
 * Avisar a los demás participantes de un mensaje nuevo (notificación dentro de la app).
 * Nunca lanza error: un aviso fallido no debe impedir el envío del mensaje.
 * @param {Object} task - Tarea ({ id, title, assignedTo, createdBy })
 * @param {Object} sender - { userId, email, name }
 * @param {string} preview - Texto del mensaje (o "📷 Foto")
 */
export const notifyChatParticipants = async (task, sender, preview) => {
  try {
    if (!task?.id) return;
    const last = lastNotifiedAt.get(task.id) || 0;
    if (Date.now() - last < NOTIFY_INTERVAL_MS) return;
    lastNotifiedAt.set(task.id, Date.now());

    const recipients = getChatRecipients(task, await getUsers(), sender);
    const text = (preview || '').length > 90 ? `${preview.slice(0, 90)}…` : (preview || '');

    await Promise.all(recipients.map(user => addDoc(collection(db, 'notifications'), {
      userId: user.id,
      userEmail: normalizeEmail(user.email),
      type: 'new_message',
      title: '💬 Nuevo mensaje',
      body: `${sender?.name || 'Alguien'} en "${task.title || 'una tarea'}": ${text}`,
      taskId: task.id,
      taskTitle: task.title || '',
      read: false,
      createdAt: serverTimestamp(),
    })));
  } catch (error) {
    if (__DEV__) console.error('[chat] Error avisando a participantes:', error);
  }
};

// ───────────────────────────── NO LEÍDOS ─────────────────────────────
// La hora en que cada usuario leyó por última vez cada chat se guarda en su dispositivo.
// Antes había un solo indicador por tarea que nunca se apagaba y se le mostraba
// también a quien había escrito el mensaje.

const READ_KEY = '@chat_last_read';
let readMap = {};
let readLoaded = false;
let readListeners = [];

const loadReadMap = async () => {
  if (readLoaded) return;
  try {
    const stored = await AsyncStorage.getItem(READ_KEY);
    readMap = stored ? JSON.parse(stored) : {};
  } catch (_e) {
    readMap = {};
  }
  readLoaded = true;
  readListeners.forEach(listener => listener());
};

/** Suscribirse a cambios del estado de lectura (devuelve la función para cancelar) */
export const subscribeToChatRead = (listener) => {
  readListeners.push(listener);
  loadReadMap();
  return () => {
    readListeners = readListeners.filter(l => l !== listener);
  };
};

/** Marcar el chat de una tarea como leído hasta este momento */
export const markChatRead = async (taskId, userEmail) => {
  if (!taskId) return;
  await loadReadMap();
  readMap = { ...readMap, [`${normalizeEmail(userEmail)}|${taskId}`]: Date.now() };
  readListeners.forEach(listener => listener());
  try {
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(readMap));
  } catch (_e) {
    // Sin almacenamiento el indicador solo vale para esta sesión
  }
};

/**
 * ¿Tiene la tarea mensajes que este usuario no ha leído?
 * @param {Object} task - Tarea con lastMessageAt / lastMessageByEmail
 * @param {Object} user - { email, displayName }
 * @returns {boolean}
 */
export const hasUnreadChat = (task, user) => {
  const lastMessageAt = toMs(task?.lastMessageAt);
  if (!lastMessageAt || !user?.email) return false;

  // El último mensaje es mío: no hay nada que leer
  const lastByEmail = normalizeEmail(task.lastMessageByEmail);
  if (lastByEmail ? lastByEmail === normalizeEmail(user.email) : task.lastMessageBy === user.displayName) {
    return false;
  }

  const lastRead = readMap[`${normalizeEmail(user.email)}|${task.id}`] || 0;
  return lastMessageAt > lastRead;
};
