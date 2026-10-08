// firebase.js
// Configuración mínima para Firebase v9 modular + helper para Firestore
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  serverTimestamp,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Intentamos obtener valores inyectados por app.config.js (expo) o desde process.env
const extra = Constants.expoConfig?.extra || {};

// Configuración de Firebase
// NOTA: Para producción, configura estas variables en Vercel o tu hosting
const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: extra.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "infra-sublime-464215-m5.firebaseapp.com",
  projectId: extra.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "infra-sublime-464215-m5",
  storageBucket: extra.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "205062729291",
  appId: extra.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "1:205062729291:web:da314180f361bf2a3367ce",
  measurementId: extra.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || "G-T987W215LH"
};

// Advertir en desarrollo si se usan los valores de fallback hardcodeados
// (Las credenciales Firebase web son públicas por diseño; la seguridad real está en las Firestore Security Rules)
if (__DEV__ && !extra.FIREBASE_API_KEY && !process.env.FIREBASE_API_KEY) {
  console.warn('firebase.js: usando credenciales de fallback. Configura las variables de entorno en .env o app.config.js para producción.');
}

// Inicializar Firebase App (solo si no existe)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializar Firebase Auth
// - Web: persistencia del navegador (por defecto)
// - Nativo: AsyncStorage, para que la sesión sobreviva al cerrar la app
let auth;
try {
  auth = Platform.OS === 'web' || !firebaseAuth.getReactNativePersistence
    ? firebaseAuth.getAuth(app)
    : firebaseAuth.initializeAuth(app, {
        persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
      });
} catch (e) {
  // Si ya fue inicializado (hot reload), reutilizar instancia existente
  auth = firebaseAuth.getAuth(app);
}

// Inicializar Analytics (solo en plataformas que lo soportan)
let analytics = null;
try {
  // Analytics solo funciona en plataformas nativas reales (no en web/expo-web)
  if (Platform.OS !== 'web') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn('Analytics no disponible en esta plataforma:', error.message);
  analytics = null;
}

// Copia local de Firestore en el navegador (IndexedDB). Si esa copia se daña —por
// ejemplo, cuando el equipo se queda sin espacio en disco— Firestore lanza
// "INTERNAL ASSERTION FAILED: Unexpected state" y deja de responder hasta recargar,
// y al recargar vuelve a leer la misma copia dañada. Por eso, ante ese error:
//   1.ª vez → se borra la copia local y se recarga la página
//   si se repite en menos de 10 minutos → se recarga usando solo memoria
// Las tareas pendientes sin conexión no se pierden: van en la cola propia de la app
// (services/offlineSync), no en esta copia.
const CACHE_CLEAR_KEY = 'firestore_clear_cache';
const CACHE_MEMORY_KEY = 'firestore_memory_cache';
const CACHE_RECOVERY_AT_KEY = 'firestore_recovery_at';
const CACHE_RETRY_WINDOW_MS = 10 * 60 * 1000;
const CACHE_MEMORY_MAX_MS = 24 * 60 * 60 * 1000;

const webStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // almacenamiento bloqueado (modo privado estricto)
  }
};

const prepareWebCache = () => {
  const storage = webStorage();
  if (!storage) return { useMemory: false };
  try {
    if (storage.getItem(CACHE_CLEAR_KEY) === '1') {
      storage.removeItem(CACHE_CLEAR_KEY);
      // Se pide antes de abrir Firestore: IndexedDB atiende las peticiones en orden
      window.indexedDB?.deleteDatabase(`firestore/[DEFAULT]/${firebaseConfig.projectId}/main`);
    }
    // Pasado un día se vuelve a intentar con la copia en disco
    const last = Number(storage.getItem(CACHE_RECOVERY_AT_KEY) || 0);
    if (Date.now() - last > CACHE_MEMORY_MAX_MS) storage.removeItem(CACHE_MEMORY_KEY);
    return { useMemory: storage.getItem(CACHE_MEMORY_KEY) === '1' };
  } catch {
    return { useMemory: false };
  }
};

let recovering = false;
const recoverFromFirestoreFailure = (message) => {
  if (recovering || !String(message || '').includes('INTERNAL ASSERTION FAILED')) return;
  const storage = webStorage();
  if (!storage) return;
  try {
    const usingMemory = storage.getItem(CACHE_MEMORY_KEY) === '1';
    const last = Number(storage.getItem(CACHE_RECOVERY_AT_KEY) || 0);
    const repeated = Date.now() - last < CACHE_RETRY_WINDOW_MS;
    // Ya sin copia local y sigue fallando: recargar otra vez no lo arregla
    if (usingMemory && repeated) return;
    recovering = true;
    storage.setItem(CACHE_RECOVERY_AT_KEY, String(Date.now()));
    storage.setItem(CACHE_CLEAR_KEY, '1');
    if (repeated) storage.setItem(CACHE_MEMORY_KEY, '1');
    else storage.removeItem(CACHE_MEMORY_KEY);
    window.location.reload();
  } catch {
    // Sin acceso al almacenamiento: no se puede reparar desde aquí
  }
};

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('error', (event) => recoverFromFirestoreFailure(event?.message || event?.error?.message));
  window.addEventListener('unhandledrejection', (event) => recoverFromFirestoreFailure(event?.reason?.message));
}

// Inicializar Firestore con persistencia offline
// - Web: IndexedDB (multi-tab) → los datos persisten aunque se cierre el navegador
// - Nativo: memoria (AsyncStorage lo maneja la propia app)
let db;
try {
  if (Platform.OS === 'web') {
    const { useMemory } = prepareWebCache();
    db = initializeFirestore(app, {
      localCache: useMemory
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  // Si ya fue inicializado (hot reload), reutilizar instancia existente
  db = getFirestore(app);
}

// Inicializar Storage
let storage = null;
try {
  storage = getStorage(app);
} catch (error) {
  console.warn('Storage no disponible:', error.message);
}

// Exportar app, db, storage, analytics y funciones de Firestore
export {
  app,
  auth,
  firebaseConfig,
  db,
  storage,
  analytics,
  // Funciones de Firestore
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  increment,
  Timestamp
};

// Helper: timestamp de servidor (útil para operaciones y mensajes)
export const getServerTimestamp = () => serverTimestamp();
