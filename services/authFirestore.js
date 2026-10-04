// services/authFirestore.js
// Sistema de autenticación.
// Usa Firebase Auth para los usuarios ya migrados (ver docs/MIGRACION_FIREBASE_AUTH.md)
// y cae al esquema anterior (hash en Firestore) para los que aún no lo están.
import { collection, query, where, getDocs, getDoc, addDoc, setDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db, firebaseConfig } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPassword, sha256Hash, legacyHash, getHashFormat } from '../utils/hashUtils';

// Normalizar email de forma consistente (misma función usada en login)
const normalizeEmailForAuth = (email) =>
  (email || '').replace(/[^a-zA-Z0-9@._\-+]/g, '').toLowerCase();

// true cuando el usuario actual inició sesión con Firebase Auth (ya migrado)
export const isFirebaseAuthSession = () => !!auth?.currentUser;

// Construir y guardar la sesión local a partir del documento de usuario
const saveSession = async (userId, userData, provider) => {
  // 🧹 LIMPIAR TODO EL CACHÉ de tareas al iniciar sesión
  // Asegurar que se carguen datos frescos de Firestore sin contaminación
  try {
    const { clearOfflineData } = await import('./offlineSync');
    await clearOfflineData();
  } catch (cleanupError) {
    if (__DEV__) console.error('Error limpiando caché en login:', cleanupError);
  }

  const session = buildSession(userId, userData, provider);

  await AsyncStorage.setItem('userSession', JSON.stringify(session));
  return session;
};

// Sesión a partir del documento del usuario. El rol y las áreas SIEMPRE salen del
// documento en Firestore; la copia en AsyncStorage solo sirve para abrir la app sin red.
const buildSession = (userId, userData, provider) => ({
  userId,
  email: normalizeEmailForAuth(userData.email),
  displayName: userData.displayName,
  role: userData.role,
  department: userData.department || '',
  area: userData.area || userData.department || '',
  direcciones: userData.direcciones || [], // Direcciones a cargo del secretario
  areasPermitidas: userData.areasPermitidas || [], // Todas las áreas permitidas
  // 'firebase' = contraseña validada por Firebase Auth; 'legacy' = hash en Firestore
  authProvider: provider,
});

// Firebase Auth restaura su sesión de forma asíncrona al abrir la app
let authReadyPromise = null;
const waitForAuthReady = () => {
  if (!authReadyPromise) {
    authReadyPromise = typeof auth?.authStateReady === 'function'
      ? auth.authStateReady().catch(() => {})
      : Promise.resolve();
  }
  return authReadyPromise;
};

/**
 * ¿La sesión guardada corresponde a la cuenta autenticada en Firebase Auth?
 * Evita que alguien cambie el usuario o el rol editando la copia local:
 *   - si hay cuenta de Firebase Auth, la sesión debe ser de ese mismo uid
 *   - si la sesión dice venir de Firebase Auth pero ya no hay cuenta activa, no vale
 */
const isSessionConsistentWithAuth = async (session) => {
  await waitForAuthReady();
  const uid = auth?.currentUser?.uid;
  if (uid) return session.userId === uid;
  return session.authProvider !== 'firebase';
};

/**
 * Mantiene la sesión igual al documento del usuario en Firestore, en tiempo real.
 * Si el admin cambia el rol o el área, la app lo refleja sin volver a iniciar sesión;
 * si desactiva o borra al usuario, se cierra la sesión.
 *
 * @param {Object} session - Sesión actual ({ userId, authProvider })
 * @param {(session: Object) => void} onChange - Sesión con los datos del servidor
 * @param {(reason: string) => void} onRevoked - El usuario ya no puede usar la app
 * @returns {() => void} Función para cancelar la suscripción
 */
export const subscribeToSessionUser = (session, onChange, onRevoked) => {
  if (!session?.userId) return () => {};
  return onSnapshot(
    doc(db, 'users', session.userId),
    (snapshot) => {
      // Sin red y sin copia en cache no se sabe nada: se conserva la sesión guardada
      if (!snapshot.exists()) {
        if (!snapshot.metadata?.fromCache) onRevoked('deleted');
        return;
      }
      const userData = snapshot.data();
      if (userData.active === false) {
        onRevoked('disabled');
        return;
      }
      const fresh = buildSession(session.userId, userData, session.authProvider);
      AsyncStorage.setItem('userSession', JSON.stringify(fresh)).catch(() => {});
      onChange(fresh);
    },
    (error) => {
      // Con las reglas seguras, un usuario desactivado o sin cuenta ya no puede leer su documento
      if (error?.code === 'permission-denied') onRevoked('permission-denied');
    }
  );
};

// Crear la cuenta en Firebase Auth sin cerrar la sesión del admin:
// se usa una instancia secundaria de la app que se descarta al terminar.
const createAuthAccount = async (email, password) => {
  const secondaryApp = initializeApp(firebaseConfig, `user-creation-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
};

// Registrar nuevo usuario
export const registerUser = async (email, password, displayName, role = 'director') => {
  try {
    const normalizedEmail = normalizeEmailForAuth(email);
    // Verificar si el usuario ya existe
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, error: 'El usuario ya existe' };
    }

    // Con Firebase Auth activo: la cuenta vive en Auth y el documento usa el mismo uid
    if (isFirebaseAuthSession()) {
      const uid = await createAuthAccount(normalizedEmail, password);
      await setDoc(doc(db, 'users', uid), {
        email: normalizedEmail,
        displayName: displayName,
        role: role,
        active: true,
        createdAt: new Date()
      });
      return { success: true, userId: uid, userData: { email, displayName, role } };
    }

    // Crear nuevo usuario (esquema anterior)
    const hashedPassword = await hashPassword(password, normalizedEmail);
    const docRef = await addDoc(usersRef, {
      email: normalizedEmail,
      password: hashedPassword,
      displayName: displayName,
      role: role, // 'admin', 'secretario', o 'director'
      active: true,
      createdAt: new Date()
    });
    
    return { 
      success: true, 
      userId: docRef.id,
      userData: { email, displayName, role }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Iniciar sesión
export const loginUser = async (email, password) => {
  try {
    const normalizedEmail = normalizeEmailForAuth(email);

    // 1) Usuarios migrados: Firebase Auth valida la contraseña en el servidor
    let firebaseUser = null;
    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      firebaseUser = credential.user;
    } catch (_authError) {
      // Sin cuenta en Firebase Auth (o proveedor deshabilitado): probar esquema anterior
    }

    if (firebaseUser) {
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userSnap.exists()) {
        await signOut(auth).catch(() => {});
        return { success: false, error: 'Usuario no encontrado' };
      }
      const userData = userSnap.data();
      if (userData.active === false) {
        await signOut(auth).catch(() => {});
        return { success: false, error: 'Usuario desactivado' };
      }
      const session = await saveSession(firebaseUser.uid, userData, 'firebase');
      return { success: true, user: session };
    }

    // 2) Esquema anterior: hash guardado en Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Usuario no encontrado', code: 'user-not-found' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // Verificar contraseña con migración automática entre 3 generaciones de hash:
    //   legacy (32-bit) → sha256 (intermedio) → pbkdf2 (actual)
    // En cada login exitoso con formato viejo se migra silenciosamente al más nuevo.
    const storedHash = userData.password;
    const format = getHashFormat(storedHash);
    let passwordValid = false;

    if (format === 'pbkdf2') {
      const hash = await hashPassword(password, normalizedEmail);
      passwordValid = storedHash === hash;
    } else if (format === 'sha256') {
      const hash = await sha256Hash(password, normalizedEmail);
      if (storedHash === hash) {
        passwordValid = true;
        // Migrar de sha256 → pbkdf2 en background
        hashPassword(password, normalizedEmail)
          .then(pbkdf2 => updateDoc(doc(db, 'users', userDoc.id), { password: pbkdf2 }))
          .catch(() => {});
      }
    } else {
      // formato legacy
      const hash = legacyHash(password + normalizedEmail);
      if (storedHash === hash) {
        passwordValid = true;
        // Migrar de legacy → pbkdf2 en background
        hashPassword(password, normalizedEmail)
          .then(pbkdf2 => updateDoc(doc(db, 'users', userDoc.id), { password: pbkdf2 }))
          .catch(() => {});
      }
    }

    if (!passwordValid) {
      return { success: false, error: 'Contraseña incorrecta', code: 'wrong-password' };
    }

    // Verificar si está activo
    if (userData.active === false) {
      return { success: false, error: 'Usuario desactivado', code: 'user-disabled' };
    }

    const session = await saveSession(userDoc.id, userData, 'legacy');

    return { success: true, user: session };
  } catch (error) {
    // Con las reglas seguras activas, la colección users no se puede leer sin sesión:
    // un login fallido en Firebase Auth termina aquí
    if (error?.code === 'permission-denied') {
      return { success: false, error: 'Credenciales incorrectas', code: 'wrong-password' };
    }
    // Cualquier otro error (sin conexión, fallo del dispositivo) NO es una contraseña
    // equivocada: la pantalla de inicio no debe contarlo como intento fallido
    return {
      success: false,
      error: 'No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.',
      code: 'unavailable',
      detail: error?.message,
    };
  }
};

// Cambiar la contraseña de otro usuario (solo admin)
export const adminSetUserPassword = async (userId, email, newPassword) => {
  // Usuarios migrados: solo el servidor puede cambiar la contraseña de otra cuenta
  if (isFirebaseAuthSession()) {
    const setPassword = httpsCallable(getFunctions(app), 'adminSetUserPassword');
    await setPassword({ userId, newPassword });
    return;
  }

  // Esquema anterior: hash en Firestore
  const hashed = await hashPassword(newPassword, normalizeEmailForAuth(email));
  await updateDoc(doc(db, 'users', userId), { password: hashed });
};

// Cerrar sesión
export const logoutUser = async () => {
  try {
    // Obtener el usuario actual antes de borrar la sesión
    const sessionData = await AsyncStorage.getItem('userSession');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        // Limpiar caché de tareas del usuario que está haciendo logout
        const { clearUserTaskCache } = await import('./offlineSync');
        await clearUserTaskCache(session.email);
      } catch (cleanupError) {
        if (__DEV__) console.error('Error limpiando caché en logout:', cleanupError);
      }
    }

    // Limpiar deleteManager (tareas marcadas como eliminadas localmente)
    try {
      const { deleteManager } = await import('../utils/deleteManager');
      deleteManager.reset();
    } catch (_e) { /* silent */ }

    // Remover la sesión
    await AsyncStorage.removeItem('userSession');
    if (auth?.currentUser) await signOut(auth).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Cada cuánto se vuelve a leer el usuario desde Firestore para refrescar la sesión
const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;
let lastSessionRefresh = 0;

// Obtener sesión actual
export const getCurrentSession = async () => {
  try {
    const sessionData = await AsyncStorage.getItem('userSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      // Normalizar email: quitar espacios, caracteres invisibles y no-ASCII
      session.email = normalizeEmailForAuth(session.email);

      // La copia local no se da por buena si no coincide con la cuenta de Firebase Auth
      if (!(await isSessionConsistentWithAuth(session))) {
        await AsyncStorage.removeItem('userSession');
        if (auth?.currentUser) await signOut(auth).catch(() => {});
        return { success: false, error: 'La sesión ya no es válida' };
      }
      await AsyncStorage.setItem('userSession', JSON.stringify(session));

      // Sin conexión, o si se refrescó hace poco, se usa la sesión guardada.
      // Esta función se llama en casi cada operación: consultar Firestore cada vez
      // deja la app esperando cuando no hay red y multiplica las lecturas cuando sí hay.
      let isOnline = true;
      try {
        const { getConnectionState } = await import('./offlineSync');
        isOnline = getConnectionState();
      } catch (_e) {
        // Sin el estado de conexión se intenta el refresh normal
      }
      if (!isOnline || Date.now() - lastSessionRefresh < SESSION_REFRESH_INTERVAL_MS) {
        return { success: true, session };
      }

      // Refrescar datos del usuario desde Firebase para obtener campos actualizados
      try {
        lastSessionRefresh = Date.now();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          // Si el usuario fue desactivado, cerrar sesión
          if (userData.active === false) {
            await AsyncStorage.removeItem('userSession');
            return { success: false, error: 'Usuario desactivado' };
          }
          // Actualizar sesión con datos frescos de Firebase
          const updatedSession = {
            ...session,
            email: normalizeEmailForAuth(userData.email || session.email),
            displayName: userData.displayName || session.displayName,
            role: userData.role || session.role,
            department: userData.department || session.department,
            area: userData.area || userData.department || session.area,
            direcciones: userData.direcciones || [],
            areasPermitidas: userData.areasPermitidas || []
          };
          
          // Guardar sesión actualizada
          await AsyncStorage.setItem('userSession', JSON.stringify(updatedSession));
          return { success: true, session: updatedSession };
        }
      } catch (refreshError) {
        // Si falla el refresh, usar sesión local
        if (__DEV__) console.error('Error refrescando sesión:', refreshError.message);
      }
      
      return { success: true, session };
    }
    return { success: false, error: 'No hay sesión activa' };
  } catch (error) {
    // Solo una sesión ilegible (datos corruptos) se borra. Un fallo pasajero del
    // dispositivo no debe cerrar la sesión y obligar a iniciar de nuevo.
    if (error instanceof SyntaxError) {
      try {
        await AsyncStorage.removeItem('userSession');
      } catch (_cleanupError) {
        // Error silencioso
      }
    }
    return { success: false, error: error.message };
  }
};

// Verificar si el usuario es admin
export const isAdmin = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return result.session.role === 'admin';
  }
  return false;
};

// Verificar si el usuario es secretario
export const isSecretario = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return result.session.role === 'secretario';
  }
  return false;
};

// Verificar si el usuario es secretario o admin (puede delegar tareas)
export const isSecretarioOrAdmin = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return result.session.role === 'admin' || result.session.role === 'secretario' || result.session.role === 'director';
  }
  return false;
};

// Verificar si el usuario es director
export const isDirector = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return result.session.role === 'director';
  }
  return false;
};

