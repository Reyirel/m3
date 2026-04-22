import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';

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
    console.error('Error obteniendo usuarios por departamento:', error);
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
    console.error('Error obteniendo usuarios por rol:', error);
    return [];
  }
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
    
    // Helper para normalizar nombres de área (quitar prefijos)
    const normalizeArea = (name) => (name || '').trim()
      .replace(/^(Secretaría|Dirección|Oficialía|Oficial)\s+(Técnica\s+)?(de|del|General)\s*/i, '')
      .replace(/^(Secretaría|Dirección)\s+/i, '')
      .trim().toLowerCase();
    
    // Helper para comparar dos nombres de área
    const areasMatch = (a, b) => {
      if (!a || !b) return false;
      const aTrimmed = a.trim();
      const bTrimmed = b.trim();
      if (aTrimmed === bTrimmed) return true;
      if (aTrimmed.length > 3 && bTrimmed.length > 3) {
        if (aTrimmed.includes(bTrimmed) || bTrimmed.includes(aTrimmed)) return true;
      }
      const aNorm = normalizeArea(aTrimmed);
      const bNorm = normalizeArea(bTrimmed);
      if (aNorm && bNorm && aNorm.length > 3 && bNorm.length > 3) {
        if (aNorm === bNorm || aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;
      }
      return false;
    };

    // Filtrar usuarios que son titulares de las áreas seleccionadas
    const titulares = allUsers.filter(user => {
      // Solo considerar directores y secretarios
      const isTitular = ['director', 'secretario'].includes(user.role);
      if (!isTitular) return false;
      
      // Campos del usuario para matching
      const userArea = (user.area || user.department || '').trim();
      const userDirecciones = user.direcciones || [];
      const userAreasPermitidas = user.areasPermitidas || [];
      
      return areas.some(area => {
        const areaTrimmed = (area || '').trim();
        if (!areaTrimmed) return false;
        
        // 1. Coincidencia con el área principal del usuario
        if (areasMatch(userArea, areaTrimmed)) return true;
        
        // 2. Coincidencia con areasPermitidas (campo clave para directores)
        if (userAreasPermitidas.some(ap => areasMatch(ap, areaTrimmed))) return true;
        
        // 3. Coincidencia con direcciones a cargo (secretarios)
        if (userDirecciones.some(dir => areasMatch(dir, areaTrimmed))) return true;
        
        return false;
      });
    });
    
    return titulares;
  } catch (error) {
    console.error('Error obteniendo titulares por áreas:', error);
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
    console.error('Error obteniendo usuarios:', error);
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
