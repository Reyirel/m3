/**
 * ============================================
 * TASK CREATOR SERVICE (UNIFIED)
 * ============================================
 * 
 * Servicio centralizado para creación/edición de tareas.
 * Reemplaza: tasks.js, tasksMultiple.js (parcialmente)
 * Elimina complejidad duplicada de:
 *   - Validación (ahora aquí)
 *   - Normalización (assignedTo siempre es array)
 *   - Subtareas por área (integradas)
 *   - Notificaciones (integradas)
 *   - Offline sync (integrado)
 * 
 * USO SIMPLE:
 *   const result = await TaskCreator.create(formData);
 *   const result = await TaskCreator.update(taskId, formData);
 *   const result = await TaskCreator.delete(taskId);
 */

import {
  collection,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { toMs } from '../utils/dateUtils';
import { ValidationRules, Validator } from '../utils/ValidationRules';

const TASKS_COLLECTION = 'tasks';

// ============================================
// VALIDATION LAYER
// ============================================

/**
 * Validar datos de formulario antes de crear/actualizar
 */
/**
 * Validate task data using centralized ValidationRules
 * Replaces local validation logic
 */
function validateTaskData(data) {
  const validator = new Validator();

  // Apply rules using centralized ValidationRules
  validator.applyRule(ValidationRules.taskTitle, data.title);
  validator.applyRule(ValidationRules.taskDescription, data.description);
  
  // Assignees
  const assignees = Array.isArray(data.assignedEmails)
    ? data.assignedEmails
    : data.assignedEmails
    ? [data.assignedEmails]
    : [];
  validator.check(assignees.length > 0, 'Debe asignar la tarea a al menos 1 persona');

  // Areas
  const areas = Array.isArray(data.areas)
    ? data.areas
    : data.area
    ? [data.area]
    : [];
  validator.check(areas.length > 0, 'Debe seleccionar al menos 1 área');

  validator.applyRule(ValidationRules.priority, data.priority);
  validator.applyRule(ValidationRules.dueDate, data.dueAt);
  validator.applyRule(ValidationRules.estimatedHours, data.estimatedHours);

  return {
    valid: validator.isValid(),
    errors: validator.getErrors(),
  };
}

// ============================================
// NORMALIZATION LAYER
// ============================================

/**
 * Normalizar y transformar datos de formulario a schema de BD
 */
async function normalizeTaskData(inputData, currentUser) {
  // Obtener nombres de usuarios
  const usersMap = await getUsersMap();

  // Normalizar emails
  const assignedEmails = (inputData.assignedEmails || [])
    .map((e) => e?.toLowerCase?.().trim?.())
    .filter((e) => e && e.includes('@'));

  const assignedNames = assignedEmails.map(
    (email) => usersMap[email] || email
  );

  // Normalizar áreas
  const areas = Array.isArray(inputData.areas)
    ? inputData.areas.filter(Boolean)
    : inputData.area
    ? [inputData.area]
    : [];

  // Construir array de asignaciones
  const assignments = assignedEmails.map((email, idx) => ({
    email,
    name: assignedNames[idx] || email,
    status: 'pendiente',
    completedAt: null,
  }));

  // Normalizar fecha (convertir a Timestamp si es necesario)
  const dueAt = inputData.dueAt ? Timestamp.fromMillis(toMs(inputData.dueAt)) : null;

  return {
    title: inputData.title.trim(),
    description: (inputData.description || '').trim(),
    priority: inputData.priority || 'media',
    areas,
    area: areas[0] || null, // Backward compat: primera área

    // ASIGNACIONES NORMALIZADAS (siempre array)
    assignedTo: assignedEmails, // Array de emails
    assignedToNames: assignedNames,
    assignments, // Array con estructura completa

    // METADATOS
    status: inputData.status || 'pendiente',
    createdBy: currentUser.userId,
    createdByName: currentUser.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dueAt,
    tags: inputData.tags || [],
    estimatedHours: inputData.estimatedHours || null,
    isRecurring: inputData.isRecurring || false,
    recurrencePattern: inputData.recurrencePattern || null,

    // COORDINACIÓN (inicialmente falso)
    isCoordinationTask: false,
    subtaskCount: 0,
    subtasksCompleted: 0,
    coordinationProgress: 0,

    // PROGRESO
    progressPercentage: 0,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtener mapa de emails -> nombres de todos los usuarios
 */
async function getUsersMap() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const map = {};

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.email) {
        map[user.email.toLowerCase()] = user.displayName || user.email;
      }
    });

    return map;
  } catch (error) {
    console.warn('Error obteniendo usuarios:', error);
    return {};
  }
}

/**
 * Crear subtareas automáticas por área
 */
async function createAreaSubtasks(parentTaskId, parentTask, batch) {
  // Solo si hay múltiples áreas
  if (!parentTask.areas || parentTask.areas.length <= 1) {
    return;
  }

  const tasksRef = collection(db, TASKS_COLLECTION);

  for (const area of parentTask.areas) {
    // Crear una subtarea por área
    const subtaskData = {
      title: `[${area}] ${parentTask.title}`,
      description: parentTask.description,
      priority: parentTask.priority,
      status: 'pendiente',
      area,
      areas: [area],

      // RELACIÓN
      parentTaskId,
      parentTaskTitle: parentTask.title,
      isSubtask: true,
      isAreaSubtask: true,

      // ASIGNACIONES (inicialmente vacías para que el secretario de cada área las asigne)
      assignedTo: [],
      assignedToNames: [],
      assignments: [],

      // METADATOS
      createdBy: parentTask.createdBy,
      createdByName: parentTask.createdByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dueAt: parentTask.dueAt,
      tags: parentTask.tags || [],

      // NO ES COORDINACIÓN
      isCoordinationTask: false,
      progressPercentage: 0,
    };

    const subtaskRef = doc(tasksRef);
    batch.set(subtaskRef, subtaskData);
  }

  // Marcar tarea padre como coordinativa
  const parentRef = doc(db, TASKS_COLLECTION, parentTaskId);
  batch.update(parentRef, {
    isCoordinationTask: true,
    subtaskCount: parentTask.areas.length,
    subtasksCompleted: 0,
    coordinationProgress: 0,
  });
}

/**
 * Enviar notificaciones a asignados
 */
async function notifyAssignees(task, taskId) {
  try {
    const { notifyAssignment } = await import('./notifications');
    if (!notifyAssignment) return;

    await notifyAssignment({
      id: taskId,
      title: task.title,
      dueAt: task.dueAt,
      assignedTo: task.assignedTo,
      priority: task.priority,
    });
  } catch (error) {
    console.warn('Error enviando notificaciones:', error);
    // Las notificaciones no son críticas
  }
}

// ============================================
// MAIN PUBLIC API
// ============================================

export const TaskCreator = {
  /**
   * CREAR nueva tarea
   * @param {Object} formData - { title, description, assignedEmails, areas, priority, dueAt, tags, estimatedHours, isRecurring }
   * @returns {Promise<{success: boolean, taskId?: string, error?: string}>}
   */
  async create(formData) {
    try {
      // 1. VALIDAR
      const validation = validateTaskData({
        ...formData,
        assignedEmails: formData.assignedEmails || formData.assignedTo,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      // 2. OBTENER SESIÓN
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        };
      }

      const currentUser = sessionResult.session;

      // 3. NORMALIZAR
      const normalizedData = await normalizeTaskData(formData, currentUser);

      // 4. CREAR EN BD (con subtareas si es multi-área)
      const batch = writeBatch(db);
      const tasksRef = collection(db, TASKS_COLLECTION);
      const taskRef = doc(tasksRef);

      // Guardar tarea principal
      batch.set(taskRef, normalizedData);

      // Si hay múltiples áreas, crear subtareas
      if (normalizedData.areas.length > 1) {
        await createAreaSubtasks(taskRef.id, normalizedData, batch);
      }

      await batch.commit();

      // 5. NOTIFICAR ASIGNADOS
      await notifyAssignees(normalizedData, taskRef.id);

      return {
        success: true,
        taskId: taskRef.id,
      };
    } catch (error) {
      console.error('TaskCreator.create error:', error);
      return {
        success: false,
        error: error.message || 'Error creando tarea',
      };
    }
  },

  /**
   * ACTUALIZAR tarea existente
   * @param {string} taskId
   * @param {Object} formData - { title, description, assignedEmails, areas, priority, dueAt, status, tags, etc }
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async update(taskId, formData) {
    try {
      // 1. VALIDAR
      const validation = validateTaskData({
        ...formData,
        assignedEmails: formData.assignedEmails || formData.assignedTo,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      // 2. OBTENER SESIÓN
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        };
      }

      const currentUser = sessionResult.session;

      // 3. NORMALIZAR
      const normalizedData = await normalizeTaskData(formData, currentUser);

      // Remover campos que no deben actualizarse
      delete normalizedData.createdAt;
      delete normalizedData.createdBy;
      delete normalizedData.createdByName;

      // 4. ACTUALIZAR EN BD
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await updateDoc(taskRef, normalizedData);

      // 5. NOTIFICAR SI CAMBIARON ASIGNADOS
      if (formData.assignedEmails) {
        await notifyAssignees(normalizedData, taskId);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('TaskCreator.update error:', error);
      return {
        success: false,
        error: error.message || 'Error actualizando tarea',
      };
    }
  },

  /**
   * ELIMINAR tarea
   * @param {string} taskId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(taskId) {
    try {
      // Eliminar tarea y sus subtareas (cascade delete)
      const batch = writeBatch(db);

      // 1. Eliminar tarea principal
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      batch.delete(taskRef);

      // 2. Eliminar subtareas asociadas
      const subtasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('parentTaskId', '==', taskId)
      );
      const subtasksSnapshot = await getDocs(subtasksQuery);
      subtasksSnapshot.forEach((subtaskDoc) => {
        batch.delete(subtaskDoc.ref);
      });

      await batch.commit();

      return {
        success: true,
      };
    } catch (error) {
      console.error('TaskCreator.delete error:', error);
      return {
        success: false,
        error: error.message || 'Error eliminando tarea',
      };
    }
  },
};

export default TaskCreator;
