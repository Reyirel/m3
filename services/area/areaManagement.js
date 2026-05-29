// services/area/areaManagement.js
// Servicio para gestionar áreas dinámicamente en Firestore

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getCurrentSession } from '../authFirestore';
import { toMs } from '../../utils/dateUtils';

const log = __DEV__ ? console.log : () => {};

const AREAS_COLLECTION = 'areas';
const AUDIT_COLLECTION = 'area_audit';

/**
 * Crear nueva área
 * @param {Object} areaData - { nombre, tipo, descripcion, jefeId, parentId, color, icono }
 * @returns {Promise<Object>} - { success, areaId, error }
 */
export const createArea = async (areaData) => {
  try {
    const { session } = await getCurrentSession();
    
    // Validar permiso de admin
    if (!session || session.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden crear áreas'
      };
    }

    // Validar campos requeridos
    if (!areaData.nombre || !areaData.tipo) {
      return {
        success: false,
        error: 'Nombre y tipo son requeridos'
      };
    }

    // Verificar que no exista un área con el mismo nombre
    const q = query(
      collection(db, AREAS_COLLECTION),
      where('nombre', '==', areaData.nombre),
      where('activa', '==', true)
    );
    const existingSnapshot = await getDocs(q);
    if (existingSnapshot.size > 0) {
      return {
        success: false,
        error: 'Ya existe un área con este nombre'
      };
    }

    // Crear documento
    const areasRef = collection(db, AREAS_COLLECTION);
    const docRef = await addDoc(areasRef, {
      nombre: areaData.nombre.trim(),
      tipo: areaData.tipo, // 'secretaria' | 'direccion'
      descripcion: areaData.descripcion || '',
      jefeId: areaData.jefeId || null,
      parentId: areaData.parentId || null,
      activa: true,
      color: areaData.color || '#9F2241',
      icono: areaData.icono || 'folder',
      orden: areaData.orden || 999,
      presupuesto: areaData.presupuesto || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: session.uid,
      updatedBy: session.uid,
    });

    // Registrar en auditoría
    await logAreaAudit(docRef.id, 'created', null, { ...areaData }, session.uid);

    log(`✅ Área creada: ${docRef.id}`);
    return {
      success: true,
      areaId: docRef.id,
    };
  } catch (error) {
    if (__DEV__) console.error('❌ Error creando área:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Actualizar área existente
 * @param {String} areaId - ID del área
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} - { success, error }
 */
export const updateArea = async (areaId, updates) => {
  try {
    const { session } = await getCurrentSession();
    
    // Validar permiso
    if (!session || session.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden editar áreas'
      };
    }

    // Obtener datos antiguos para auditoría
    const areaRef = doc(db, AREAS_COLLECTION, areaId);
    const oldAreaData = await getAreaById(areaId);

    if (!oldAreaData) {
      return {
        success: false,
        error: 'Área no encontrada'
      };
    }

    // Actualizaciones permitidas
    const allowedUpdates = {
      nombre: updates.nombre || oldAreaData.nombre,
      descripcion: updates.descripcion !== undefined ? updates.descripcion : oldAreaData.descripcion,
      jefeId: updates.jefeId !== undefined ? updates.jefeId : oldAreaData.jefeId,
      color: updates.color || oldAreaData.color,
      icono: updates.icono || oldAreaData.icono,
      presupuesto: updates.presupuesto !== undefined ? updates.presupuesto : oldAreaData.presupuesto,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid,
    };

    // Si cambia nombre, verificar unicidad
    if (updates.nombre && updates.nombre !== oldAreaData.nombre) {
      const q = query(
        collection(db, AREAS_COLLECTION),
        where('nombre', '==', updates.nombre),
        where('activa', '==', true)
      );
      const existingSnapshot = await getDocs(q);
      if (existingSnapshot.size > 0) {
        return {
          success: false,
          error: 'Ya existe un área con este nombre'
        };
      }
    }

    // Actualizar
    await updateDoc(areaRef, allowedUpdates);

    // Auditoría
    await logAreaAudit(areaId, 'updated', oldAreaData, updates, session.uid);

    log(`✅ Área actualizada: ${areaId}`);
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('❌ Error editando área:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Eliminar (soft delete) un área
 * @param {String} areaId - ID del área
 * @returns {Promise<Object>} - { success, error }
 */
export const deleteArea = async (areaId) => {
  try {
    const { session } = await getCurrentSession();
    
    // Validar permiso
    if (!session || session.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden eliminar áreas'
      };
    }

    // Obtener datos del área
    const oldAreaData = await getAreaById(areaId);
    if (!oldAreaData) {
      return {
        success: false,
        error: 'Área no encontrada'
      };
    }

    // Validar que no tenga tareas activas
    const tasksQ = query(
      collection(db, 'tasks'),
      where('area', '==', areaId),
      where('status', '!=', 'cerrada')
    );
    const tasksSnapshot = await getDocs(tasksQ);

    if (tasksSnapshot.size > 0) {
      return {
        success: false,
        error: `No se puede eliminar: el área tiene ${tasksSnapshot.size} tareas activas`
      };
    }

    // Soft delete: marcar como inactiva
    const areaRef = doc(db, AREAS_COLLECTION, areaId);
    await updateDoc(areaRef, {
      activa: false,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid,
    });

    // Auditoría
    await logAreaAudit(areaId, 'deleted', oldAreaData, { activa: false }, session.uid);

    log(`✅ Área eliminada: ${areaId}`);
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('❌ Error eliminando área:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtener un área por ID
 * @param {String} areaId - ID del área
 * @returns {Promise<Object|null>} - Datos del área o null
 */
export const getAreaById = async (areaId) => {
  try {
    const areaRef = doc(db, AREAS_COLLECTION, areaId);
    const areaSnap = await getDoc(areaRef);

    if (!areaSnap.exists()) {
      return null;
    }

    return {
      id: areaSnap.id,
      ...areaSnap.data(),
    };
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo área:', error);
    return null;
  }
};

/**
 * Listar todas las áreas activas (con real-time subscription)
 * @param {Function} callback - Función que recibe array de áreas
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAreas = (callback) => {
  try {
    const areasRef = collection(db, AREAS_COLLECTION);
    const q = query(
      areasRef,
      where('activa', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const areas = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

      callback(areas);
    }, (error) => {
      if (__DEV__) console.error('Error en suscripción a áreas:', error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    if (__DEV__) console.error('Error suscribiendo a áreas:', error);
    return () => {};
  }
};

/**
 * Obtener todas las áreas de una vez (sin real-time)
 * @returns {Promise<Array>} - Array de áreas
 */
export const getAllAreas = async () => {
  try {
    const areasRef = collection(db, AREAS_COLLECTION);
    const q = query(areasRef, where('activa', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo áreas:', error);
    return [];
  }
};

/**
 * Asignar jefe a un área
 * @param {String} areaId - ID del área
 * @param {String} userId - ID del nuevo jefe
 * @returns {Promise<Object>} - { success, error }
 */
export const assignAreaChief = async (areaId, userId) => {
  try {
    const { session } = await getCurrentSession();
    
    if (!session || session.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden asignar jefes'
      };
    }

    const areaRef = doc(db, AREAS_COLLECTION, areaId);
    const oldData = await getAreaById(areaId);

    if (!oldData) {
      return {
        success: false,
        error: 'Área no encontrada'
      };
    }

    // Actualizar
    await updateDoc(areaRef, {
      jefeId: userId,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid,
    });

    // Auditoría
    await logAreaAudit(areaId, 'chief_assigned', oldData, { jefeId: userId }, session.uid);

    log(`✅ Jefe asignado a área: ${areaId}`);
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('Error asignando jefe:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Registrar cambios en auditoría
 * @private
 */
async function logAreaAudit(areaId, action, oldData, newData, userId) {
  try {
    const auditRef = collection(db, AUDIT_COLLECTION);
    await addDoc(auditRef, {
      areaId,
      action, // 'created', 'updated', 'deleted', 'chief_assigned'
      datosAnteriores: oldData || null,
      datosNuevos: newData || null,
      realizadoPor: userId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    if (__DEV__) console.error('Error en auditoría:', error);
  }
}

/**
 * Obtener historial de cambios de un área
 * @param {String} areaId - ID del área
 * @returns {Promise<Array>} - Array de cambios
 */
export const getAreaAuditLog = async (areaId) => {
  try {
    const auditRef = collection(db, AUDIT_COLLECTION);
    const q = query(auditRef, where('areaId', '==', areaId));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (toMs(b.timestamp) || 0) - (toMs(a.timestamp) || 0));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo auditoría:', error);
    return [];
  }
};
