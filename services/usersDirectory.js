// services/usersDirectory.js
// Directorio de usuarios compartido.
//
// Varias pantallas y servicios necesitan la lista de usuarios (nombres de asignados,
// destinatarios de notificaciones, selectores). Antes cada uno descargaba la colección
// completa por su cuenta; aquí se lee una vez y se reutiliza unos minutos.
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const CACHE_MS = 5 * 60 * 1000;

let cache = { loadedAt: 0, users: [] };
// Lectura en curso: las llamadas simultáneas comparten la misma petición
let inFlight = null;

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

/**
 * Todos los usuarios ({ id, ...datos }).
 * @param {Object} [options]
 * @param {boolean} [options.force] - Ignorar la copia en memoria y leer de Firestore
 * @returns {Promise<Array>}
 */
export async function getAllUsers({ force = false } = {}) {
  const fresh = Date.now() - cache.loadedAt < CACHE_MS && cache.users.length > 0;
  if (fresh && !force) return cache.users;
  if (inFlight) return inFlight;

  inFlight = getDocs(collection(db, 'users'))
    .then((snapshot) => {
      cache = {
        loadedAt: Date.now(),
        users: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
      return cache.users;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Mapa correo (normalizado) → nombre para mostrar */
export async function getDisplayNamesByEmail(options) {
  const users = await getAllUsers(options);
  const map = {};
  users.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (email) map[email] = user.displayName || user.email;
  });
  return map;
}

/** Descartar la copia en memoria (después de crear, editar o desactivar un usuario) */
export function invalidateUsersDirectory() {
  cache = { loadedAt: 0, users: [] };
}

const toUser = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

/**
 * Lista de usuarios en tiempo real.
 * @param {(users: Array) => void} callback
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} Función para dejar de escuchar
 */
export function subscribeToUsers(callback, onError) {
  return onSnapshot(collection(db, 'users'), (snapshot) => callback(snapshot.docs.map(toUser)), onError);
}

/** Usuarios con un rol ('admin' | 'secretario' | 'director') */
export async function getUsersByRole(role) {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
  return snapshot.docs.map(toUser);
}

/** Usuario con ese correo, o null si no existe */
export async function findUserByEmail(email) {
  const snapshot = await getDocs(query(collection(db, 'users'), where('email', '==', normalizeEmail(email))));
  return snapshot.empty ? null : toUser(snapshot.docs[0]);
}

/** Cambiar el rol de un usuario (solo el administrador) */
export async function setUserRole(userId, role) {
  await updateDoc(doc(db, 'users', userId), { role });
  invalidateUsersDirectory();
}

/** Eliminar la cuenta de un usuario (solo el administrador) */
export async function deleteUser(userId) {
  await deleteDoc(doc(db, 'users', userId));
  invalidateUsersDirectory();
}
