// firebase.js
// Configuración mínima para Firebase v9 modular + helper para Firestore
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

// Inicializar Firestore con persistencia offline
// - Web: IndexedDB (multi-tab) → los datos persisten aunque se cierre el navegador
// - Nativo: memoria (AsyncStorage lo maneja la propia app)
let db;
try {
  if (Platform.OS === 'web') {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
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
