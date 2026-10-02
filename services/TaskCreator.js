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
  getDoc,
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
import { getSecretariasForAreas } from '../config/areas';

const TASKS_COLLECTION = 'tasks';
const VALID_STATUSES = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

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
function validateTaskData(data, { isUpdate = false } = {}) {
  const validator = new Validator();

  // Apply rules using centralized ValidationRules
  validator.applyRule(ValidationRules.taskTitle, data.title);
  validator.applyRule(ValidationRules.taskDescription, data.description);
  // Misma regla que el formulario (useTaskOperations): la descripción es obligatoria
  validator.check(
    typeof data.description === 'string' && data.description.trim().length >= 10,
    'La descripción debe tener al menos 10 caracteres'
  );

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

  if (data.status !== undefined && data.status !== null) {
    validator.check(VALID_STATUSES.includes(data.status), `Estado inválido: ${data.status}`);
  }

  // Al crear, la fecha límite no puede ser de un día anterior a hoy
  if (!isUpdate && data.dueAt) {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    validator.check(toMs(data.dueAt) >= startOfToday, 'La fecha límite no puede ser anterior a hoy');
  }

  return {
    valid: validator.isValid(),
    errors: validator.getErrors(),
  };
}

// ============================================
// NORMALIZATION LAYER
// ============================================

/**
 * Normalizar y transformar datos de formulario a schema de BD.
 * Devuelve dos grupos de campos:
 *   fields  → lo que el formulario define (se guarda al crear y al editar)
 *   initial → estado inicial de una tarea nueva (NO se reescribe al editar,
 *             para no perder confirmaciones, avance ni coordinación entre áreas)
 */
async function normalizeTaskData(inputData, currentUser) {
  const usersMap = await getUsersMap();

  // Normalizar emails (acepta assignedEmails del formulario o assignedTo de una tarea existente)
  const rawAssignees = inputData.assignedEmails || inputData.assignedTo || [];
  const assignedEmails = [...new Set(
    (Array.isArray(rawAssignees) ? rawAssignees : [rawAssignees])
      .map((e) => e?.toLowerCase?.().trim?.())
      .filter((e) => e && e.includes('@'))
  )];

  // Los asignados deben ser usuarios activos (si no se pudo leer la lista, no se bloquea)
  if (Object.keys(usersMap).length > 0) {
    assignedEmails.forEach((email) => {
      const user = usersMap[email];
      if (!user) throw new Error(`El usuario ${email} no existe`);
      if (!user.active) throw new Error(`${user.name} tiene la cuenta desactivada y no puede recibir tareas`);
    });
  }

  const assignedNames = assignedEmails.map((email) => usersMap[email]?.name || email);

  // Normalizar áreas
  const areas = Array.isArray(inputData.areas)
    ? inputData.areas.filter(Boolean)
    : inputData.area
    ? [inputData.area]
    : [];

  // Secretarías que pueden ver la tarea: las de sus áreas y las de sus asignados
  const secretarias = [...new Set([
    ...getSecretariasForAreas(areas),
    ...assignedEmails.map((email) => usersMap[email]?.secretaria).filter(Boolean),
  ])];

  // Normalizar fecha (convertir a Timestamp si es necesario)
  const dueAt = inputData.dueAt ? Timestamp.fromMillis(toMs(inputData.dueAt)) : null;

  const fields = {
    title: inputData.title.trim(),
    description: (inputData.description || '').trim(),
    priority: inputData.priority || 'media',
    areas,
    area: areas[0] || null, // Backward compat: primera área
    secretarias,

    // ASIGNACIONES NORMALIZADAS (siempre array)
    assignedTo: assignedEmails, // Array de emails
    assignedToNames: assignedNames,

    updatedAt: serverTimestamp(),
    dueAt,
    tags: inputData.tags || [],
    estimatedHours: inputData.estimatedHours || null,
    isRecurring: inputData.isRecurring || false,
    recurrencePattern: inputData.recurrencePattern || null,
  };

  const initial = {
    // Array con estructura completa
    assignments: assignedEmails.map((email, idx) => ({
      email,
      name: assignedNames[idx] || email,
      status: 'pendiente',
      completedAt: null,
    })),

    // METADATOS
    status: inputData.status || 'pendiente',
    createdBy: currentUser.userId,
    createdByName: currentUser.displayName,
    createdAt: serverTimestamp(),

    // COORDINACIÓN (inicialmente falso)
    isCoordinationTask: false,
    subtaskCount: 0,
    subtasksCompleted: 0,
    coordinationProgress: 0,

    // PROGRESO
    progressPercentage: 0,
  };

  return { fields, initial };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtener mapa de email -> { name, active, secretaria } de todos los usuarios
 */
async function getUsersMap() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const map = {};

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.email) {
        map[user.email.toLowerCase().trim()] = {
          name: user.displayName || user.email,
          active: user.active !== false,
          secretaria: getSecretariasForAreas([user.secretaria || user.area || user.department])[0] || null,
        };
      }
    });

    return map;
  } catch (error) {
    if (__DEV__) console.warn('Error obteniendo usuarios:', error);
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
      secretarias: getSecretariasForAreas([area]),

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
    if (__DEV__) console.warn('Error enviando notificaciones:', error);
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
      const { fields, initial } = await normalizeTaskData(formData, currentUser);
      const normalizedData = { ...fields, ...initial };

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
      if (__DEV__) console.error('TaskCreator.create error:', error);
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
      }, { isUpdate: true });

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

      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
        return {
          success: false,
          error: 'La tarea ya no existe',
        };
      }
      const existing = taskSnap.data();

      // 3. NORMALIZAR — solo los campos del formulario. El avance, la coordinación
      // entre áreas y los datos de creación se conservan como están.
      const { fields, initial } = await normalizeTaskData(formData, currentUser);
      const normalizedData = { ...fields };

      if (formData.status) {
        normalizedData.status = formData.status;
      }

      // Conservar el estado de quienes siguen asignados; solo los nuevos empiezan en pendiente
      const previousAssignments = Array.isArray(existing.assignments) ? existing.assignments : [];
      normalizedData.assignments = initial.assignments.map(
        (assignment) => previousAssignments.find((prev) => prev.email === assignment.email) || assignment
      );

      // Quitar las confirmaciones de quienes ya no están asignados
      if (Array.isArray(existing.completedBy)) {
        normalizedData.completedBy = existing.completedBy.filter((confirmation) =>
          fields.assignedTo.includes((confirmation.email || '').toLowerCase().trim())
        );
      }

      // 4. ACTUALIZAR EN BD
      await updateDoc(taskRef, normalizedData);

      // 5. NOTIFICAR SI CAMBIARON ASIGNADOS
      if (formData.assignedEmails) {
        await notifyAssignees(normalizedData, taskId);
      }

      return {
        success: true,
      };
    } catch (error) {
      if (__DEV__) console.error('TaskCreator.update error:', error);
      return {
        success: false,
        error: error.message || 'Error actualizando tarea',
      };
    }
  },

  /**
   * ELIMINAR tarea: la manda a la papelera junto con sus subtareas de área.
   * No borra documentos (deleted: true), para que un borrado por error se pueda deshacer.
   * @param {string} taskId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(taskId) {
    try {
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success || sessionResult.session.role !== 'admin') {
        return {
          success: false,
          error: 'Solo el administrador puede eliminar tareas',
        };
      }

      const batch = writeBatch(db);
      const trashFields = {
        deleted: true,
        deletedBy: sessionResult.session.email || '',
        deletedAt: serverTimestamp(),
      };

      // 1. Tarea principal
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      batch.update(taskRef, trashFields);

      // 2. Subtareas asociadas
      const subtasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('parentTaskId', '==', taskId)
      );
      const subtasksSnapshot = await getDocs(subtasksQuery);
      subtasksSnapshot.forEach((subtaskDoc) => {
        batch.update(subtaskDoc.ref, trashFields);
      });

      await batch.commit();

      return {
        success: true,
      };
    } catch (error) {
      if (__DEV__) console.error('TaskCreator.delete error:', error);
      return {
        success: false,
        error: error.message || 'Error eliminando tarea',
      };
    }
  },
};

export default TaskCreator;
