import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { resolveAreaName, getDireccionesBySecretaria } from '../config/areas';

// Roles disponibles en el sistema
export const ROLES = {
  ADMIN: 'admin',           // Alcalde (máximo nivel)
  SECRETARIO: 'secretario', // Secretario
  DIRECTOR: 'director'      // Director de área (nivel medio)
};

// Jerarquía de roles (mayor número = mayor nivel)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.SECRETARIO]: 2,
  [ROLES.DIRECTOR]: 1
};

// Departamentos del municipio
export const DEPARTMENTS = {
  PRESIDENCIA: 'presidencia',
  JURIDICA: 'juridica',
  OBRAS: 'obras',
  TESORERIA: 'tesoreria',
  RRHH: 'rrhh',
  ADMINISTRACION: 'administracion'
};

// Obtener perfil completo del usuario
export const getUserProfile = async (userId = null) => {
  try {
    let uid = userId;
    
    if (!uid) {
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success) return null;
      uid = sessionResult.session.userId;
    }
    
    if (!uid) return null;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Crear perfil de usuario al registrarse
export const createUserProfile = async (userId, data) => {
  try {
    const userProfile = {
      email: data.email,
      displayName: data.displayName || '',
      role: ROLES.DIRECTOR, // Por defecto director
      department: data.department || '',
      createdAt: new Date().toISOString(),
      active: true
    };

    await setDoc(doc(db, 'users', userId), userProfile);
    return userProfile;
  } catch (error) {
    throw error;
  }
};

// Actualizar perfil de usuario
export const updateUserProfile = async (userId, updates) => {
  try {
    // No permitir cambio de rol desde aquí (solo admin)
    const { role: _role, ...safeUpdates } = updates;
    await updateDoc(doc(db, 'users', userId), {
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

// Actualizar rol de usuario (solo admin)
export const updateUserRole = async (userId, newRole) => {
  try {
    const currentUser = await getUserProfile();
    if (!currentUser || currentUser.role !== ROLES.ADMIN) {
      throw new Error('No tienes permisos para cambiar roles');
    }

    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

// Verificar si el usuario es admin
export const isAdmin = async () => {
  try {
    const profile = await getUserProfile();
    return profile?.role === ROLES.ADMIN;
  } catch (error) {
    return false;
  }
};

// Verificar si el usuario es secretario
export const isSecretario = async () => {
  try {
    const profile = await getUserProfile();
    return profile?.role === ROLES.SECRETARIO;
  } catch (error) {
    return false;
  }
};

// Verificar si el usuario es secretario o admin (puede delegar tareas)
export const isSecretarioOrAdmin = async () => {
  try {
    const profile = await getUserProfile();
    return profile?.role === ROLES.ADMIN || profile?.role === ROLES.SECRETARIO;
  } catch (error) {
    return false;
  }
};

// Verificar si el usuario puede delegar tareas (admin o secretario)
export const canDelegateTasks = async () => {
  try {
    const profile = await getUserProfile();
    const delegateRoles = [ROLES.ADMIN, ROLES.SECRETARIO];
    return delegateRoles.includes(profile?.role);
  } catch (error) {
    return false;
  }
};

// Verificar nivel de rol
export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

// Verificar si un rol puede gestionar a otro
export const canManageRole = (managerRole, targetRole) => {
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
};

// Obtener usuarios por departamento
export const getUsersByDepartment = async (department) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('department', '==', department),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo usuarios por departamento:', error);
    return [];
  }
};

// Obtener usuarios por rol
export const getUsersByRole = async (role) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', role),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo usuarios por rol:', error);
    return [];
  }
};

// Nombre canónico de un área en minúsculas, para comparar sin depender de alias ni mayúsculas
const areaKey = (name) => resolveAreaName((name || '').trim()).toLowerCase();

/**
 * ¿Es el usuario titular de esa área? Coincidencia exacta (tras resolver alias):
 * elegir una dirección NO trae a las demás direcciones de la misma secretaría.
 *   - secretario: su área es su secretaría (sus direcciones no lo hacen titular de ellas)
 *   - director: su dirección está en areasPermitidas; si no tiene, en area
 */
export const isTitularOfArea = (user, area) => {
  const target = areaKey(area);
  if (!target || !user) return false;

  const ownArea = areaKey(user.area || user.department);
  if (user.role === 'secretario') return ownArea === target;

  const permitidas = (user.areasPermitidas || []).map(areaKey).filter(Boolean);
  return permitidas.length > 0 ? permitidas.includes(target) : ownArea === target;
};

/**
 * ¿Está el director adscrito a la secretaría de este secretario?
 * Se usa para limitar a quién puede delegar un secretario.
 */
export const isDirectorOfSecretario = (director, secretario) => {
  const secretaria = resolveAreaName((secretario?.area || secretario?.department || '').trim());
  if (!secretaria || !director) return false;

  const scope = new Set(
    [secretaria, ...getDireccionesBySecretaria(secretaria), ...(secretario.direcciones || [])]
      .map(areaKey)
      .filter(Boolean)
  );
  return [director.secretaria, director.area, ...(director.areasPermitidas || [])]
    .map(areaKey)
    .some(key => key && scope.has(key));
};

// Obtener titulares (directores/secretarios) de áreas específicas
export const getTitularesByAreas = async (areas) => {
  try {
    if (!areas || areas.length === 0) return [];
    
    // Obtener todos los usuarios activos que son directores o secretarios
    const q = query(
      collection(db, 'users'),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Solo directores y secretarios que son titulares EXACTAMENTE de las áreas seleccionadas
    return allUsers.filter(user =>
      ['director', 'secretario'].includes(user.role) &&
      areas.some(area => isTitularOfArea(user, area))
    );
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo titulares por áreas:', error);
    return [];
  }
};

// Obtener todos los usuarios activos (solo admin)
export const getAllUsers = async () => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error('No tienes permisos para ver todos los usuarios');
    }

    const q = query(collection(db, 'users'), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo usuarios:', error);
    return [];
  }
};

// Desactivar usuario (soft delete - solo admin)
export const deactivateUser = async (userId) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error('No tienes permisos para desactivar usuarios');
    }

    await updateDoc(doc(db, 'users', userId), {
      active: false,
      deactivatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

// Obtener emails de todos los usuarios activos para asignación de tareas
export const getAllUsersNames = async () => {
  try {
    const q = query(collection(db, 'users'), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => doc.data().email) // Usar email en lugar de displayName
      .filter(email => email) // Filtrar nulls/undefined
      .sort();
  } catch (error) {
    return [];
  }
};
