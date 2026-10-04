/**
 * utils/taskHelpers.js
 * Consolidated utility functions for task operations
 * Previously duplicated across 4 different service files
 */

/**
 * Normaliza el campo status de una tarea al valor canónico.
 * Firestore puede tener datos con variantes históricas (en_progreso, en-progreso).
 * Canónico: en_proceso | en_revision | pendiente | cerrada
 * @param {string} status
 * @returns {string}
 */
export { normalizeStatus } from './taskStatus';

/**
 * Check if a task is assigned to a specific user
 * Supports both string (old format) and array (new standard) for assignedTo field
 * @param {Object} task - Task object
 * @param {string} userEmail - User email to check
 * @returns {boolean} True if task is assigned to user
 */
export function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;

  const normalizedUserEmail = userEmail?.toLowerCase().trim() || '';
  if (!normalizedUserEmail) return false;

  if (Array.isArray(task.assignedTo)) {
    // Normalizar todos los emails en el array antes de comparar
    return task.assignedTo.some(email =>
      email?.toLowerCase().trim() === normalizedUserEmail
    );
  }

  // Backward compatibility: old string format
  return (task.assignedTo?.toLowerCase().trim() || '') === normalizedUserEmail;
}

/**
 * Correos asignados a la tarea, normalizados y sin repetir
 * (assignedTo puede ser string en datos antiguos)
 * @param {Object} task
 * @returns {Array<string>}
 */
export function getAssignedEmails(task) {
  const raw = task?.assignedTo;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(list.map(email => (email || '').toLowerCase().trim()).filter(Boolean))];
}

/**
 * Correos que ya confirmaron su parte Y siguen asignados a la tarea.
 * La confirmación de alguien que ya no está asignado no cuenta.
 * @param {Array} completedBy - Confirmaciones [{ email, ... }]
 * @param {Array<string>} assignedEmails - Resultado de getAssignedEmails
 * @returns {Set<string>}
 */
export function getConfirmedEmails(completedBy, assignedEmails) {
  return new Set(
    (completedBy || [])
      .map(c => (c?.email || '').toLowerCase().trim())
      .filter(email => assignedEmails.includes(email))
  );
}

/**
 * ¿Confirmaron su parte todos los asignados actuales?
 * @param {Object} task - Tarea con assignedTo y completedBy
 * @returns {boolean}
 */
export function haveAllAssigneesConfirmed(task) {
  const assigned = getAssignedEmails(task);
  return assigned.length > 0 && getConfirmedEmails(task?.completedBy, assigned).size === assigned.length;
}

/**
 * Get task area, handling both singular (area) and plural (areas) field formats
 * Returns the first area if multiple are present
 * @param {Object} task - Task object
 * @returns {string} Area name or 'Sin área' if not found
 */
export function getTaskArea(task) {
  if (task.area) {
    return task.area;
  } else if (task.areas && Array.isArray(task.areas) && task.areas.length > 0) {
    return task.areas[0];
  }
  return 'Sin área';
}

/**
 * Check if a user has permission to edit a task based on role
 * @param {Object} task - Task object
 * @param {string} userEmail - User email
 * @param {string} userRole - User role (ADMIN, SECRETARIO, DIRECTOR, etc.)
 * @returns {boolean} True if user can edit task
 */
export function canEditTask(task, userEmail, userRole) {
  // ADMIN can edit anything
  if (userRole === 'ADMIN') return true;

  // Task creator can edit their own tasks
  if (task.createdBy === userEmail) return true;

  // SECRETARIO can edit tasks assigned to them
  if (userRole === 'SECRETARIO' && isTaskAssignedToUser(task, userEmail)) {
    return true;
  }

  // DIRECTOR can edit tasks in their area assigned to them
  if (userRole === 'DIRECTOR' && isTaskAssignedToUser(task, userEmail)) {
    return true;
  }

  return false;
}

