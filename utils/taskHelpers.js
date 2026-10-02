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
export function normalizeStatus(status) {
  if (!status) return 'pendiente';
  switch (status.toLowerCase().replace(/[\s-]/g, '_')) {
    case 'en_progreso':
    case 'en_proceso':
      return 'en_proceso';
    case 'en_revision':
      return 'en_revision';
    case 'cerrada':
    case 'cerrado':
    case 'completada':
    case 'completado':
      return 'cerrada';
    default:
      return status;
  }
}

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

/**
 * Normalize task data for consistency across the app
 * Ensures assignedTo is always an array
 * @param {Object} task - Task object to normalize
 * @returns {Object} Normalized task
 */
export function normalizeTask(task) {
  const normalized = { ...task };

  // Normalize assignedTo to always be an array
  if (normalized.assignedTo && !Array.isArray(normalized.assignedTo)) {
    normalized.assignedTo = [normalized.assignedTo];
  }

  // Normalize areas field
  if (normalized.areas && !Array.isArray(normalized.areas)) {
    normalized.areas = [normalized.areas];
  }

  return normalized;
}

/**
 * Extract unique users from a task (either assignedTo or from subtasks)
 * @param {Object} task - Task object
 * @returns {Array<string>} Array of unique user emails
 */
export function getTaskUsers(task) {
  const users = new Set();

  if (task.assignedTo) {
    if (Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach(email => users.add(email));
    } else {
      users.add(task.assignedTo);
    }
  }

  if (task.createdBy) {
    users.add(task.createdBy);
  }

  if (task.subtasks && Array.isArray(task.subtasks)) {
    task.subtasks.forEach(subtask => {
      if (subtask.assignedTo) {
        if (Array.isArray(subtask.assignedTo)) {
          subtask.assignedTo.forEach(email => users.add(email));
        } else {
          users.add(subtask.assignedTo);
        }
      }
    });
  }

  return Array.from(users);
}

/**
 * Filter tasks by user assignment
 * @param {Array} tasks - Array of task objects
 * @param {string} userEmail - User email to filter by
 * @returns {Array} Filtered tasks
 */
export function filterTasksByUser(tasks, userEmail) {
  return tasks.filter(task => isTaskAssignedToUser(task, userEmail));
}

/**
 * Filter tasks by status
 * @param {Array} tasks - Array of task objects
 * @param {string|Array} status - Status or statuses to filter by
 * @returns {Array} Filtered tasks
 */
export function filterTasksByStatus(tasks, status) {
  if (Array.isArray(status)) {
    return tasks.filter(task => status.includes(task.status));
  }
  return tasks.filter(task => task.status === status);
}

/**
 * Filter tasks by area(s)
 * @param {Array} tasks - Array of task objects
 * @param {string|Array} areas - Area name or array of area names
 * @returns {Array} Filtered tasks
 */
export function filterTasksByArea(tasks, areas) {
  const areaList = Array.isArray(areas) ? areas : [areas];
  return tasks.filter(task => {
    const taskArea = getTaskArea(task);
    return areaList.includes(taskArea);
  });
}

/**
 * Count tasks by status
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Object with status as keys and counts as values
 */
export function countTasksByStatus(tasks) {
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Calculate task completion percentage
 * @param {Array} tasks - Array of task objects
 * @returns {number} Percentage (0-100)
 */
export function calculateCompletionPercentage(tasks) {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(task => task.status === 'cerrada').length;
  return Math.round((completed / tasks.length) * 100);
}
