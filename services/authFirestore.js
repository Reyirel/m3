// services/authFirestore.js
// Sistema de autenticación usando solo Firestore (sin Firebase Auth)
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPassword, sha256Hash, legacyHash, getHashFormat } from '../utils/hashUtils';

// Normalizar email de forma consistente (misma función usada en login)
const normalizeEmailForAuth = (email) =>
  (email || '').replace(/[^a-zA-Z0-9@._\-+]/g, '').toLowerCase();

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

    // Crear nuevo usuario
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
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Usuario no encontrado' };
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
      return { success: false, error: 'Contraseña incorrecta' };
    }
    
    // Verificar si está activo
    if (!userData.active) {
      return { success: false, error: 'Usuario desactivado' };
    }
    
    // 🧹 LIMPIAR TODO EL CACHÉ de tareas al iniciar sesión
    // Asegurar que se carguen datos frescos de Firestore sin contaminación
    try {
      const { clearOfflineData } = await import('./offlineSync');
      await clearOfflineData();
    } catch (cleanupError) {
      console.error('Error limpiando caché en login:', cleanupError);
    }
    
    // Guardar sesión en AsyncStorage
    const session = {
      userId: userDoc.id,
      email: (userData.email || '').toLowerCase().trim(),
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department || '',
      area: userData.area || userData.department || '',
      direcciones: userData.direcciones || [], // Direcciones a cargo del secretario
      areasPermitidas: userData.areasPermitidas || [] // Todas las áreas permitidas
    };
    
    await AsyncStorage.setItem('userSession', JSON.stringify(session));
    
    return { success: true, user: session };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
        console.error('Error limpiando caché en logout:', cleanupError);
      }
    }

    // Limpiar deleteManager (tareas marcadas como eliminadas localmente)
    try {
      const { deleteManager } = await import('../utils/deleteManager');
      deleteManager.reset();
    } catch (_e) { /* silent */ }

    // Remover la sesión
    await AsyncStorage.removeItem('userSession');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener sesión actual
export const getCurrentSession = async () => {
  try {
    const sessionData = await AsyncStorage.getItem('userSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      // Normalizar email: quitar espacios, caracteres invisibles y no-ASCII
      session.email = normalizeEmailForAuth(session.email);
      await AsyncStorage.setItem('userSession', JSON.stringify(session));

      // Refrescar datos del usuario desde Firebase para obtener campos actualizados
      try {
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
        console.error('Error refrescando sesión:', refreshError.message);
      }
      
      return { success: true, session };
    }
    return { success: false, error: 'No hay sesión activa' };
  } catch (error) {
    // Si hay un error al parsear o leer, limpiamos la sesión corrupta
    try {
      await AsyncStorage.removeItem('userSession');
    } catch (_cleanupError) {
      // Error silencioso
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

// Verificar si puede crear tareas (admin)
export const canCreateTasks = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return ['admin'].includes(result.session.role);
  }
  return false;
};

// Verificar si puede ver reportes (admin, secretario, director)
export const canViewReports = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return ['admin', 'secretario', 'director'].includes(result.session.role);
  }
  return false;
};

// Obtener datos del usuario actual
export const getCurrentUserData = async () => {
  const result = await getCurrentSession();
  if (result.success) {
    return { success: true, data: result.session };
  }
  return { success: false, error: 'No hay sesión activa' };
};

// Refrescar sesión desde Firestore (útil cuando el perfil se actualiza)
export const refreshSession = async () => {
  try {
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) {
      return { success: false, error: 'No hay sesión activa' };
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', sessionResult.session.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Actualizar sesión con datos frescos de Firestore
    const updatedSession = {
      userId: userDoc.id,
      email: normalizeEmailForAuth(userData.email),
      displayName: userData.displayName,
      role: userData.role,
      department: userData.department || '',
      area: userData.area || userData.department || '',
      direcciones: userData.direcciones || [],
      areasPermitidas: userData.areasPermitidas || []
    };

    await AsyncStorage.setItem('userSession', JSON.stringify(updatedSession));
    
    return { success: true, session: updatedSession };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
