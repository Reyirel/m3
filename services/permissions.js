// services/permissions.js
// Sistema centralizado de permisos para gestión de tareas
// Define qué acciones puede realizar cada rol


/**
 * Roles disponibles en orden de jerarquía
 * admin (3) > secretario (2) > director (1)
 */
export const ROLES = {
  ADMIN: 'admin',
  SECRETARIO: 'secretario',
  DIRECTOR: 'director'
};

/**
 * Permisos disponibles en el sistema
 */
export const PERMISSIONS = {
  // Tareas
  CREATE_TASK: 'create_task',
  EDIT_TASK: 'edit_task',
  DELETE_TASK: 'delete_task',
  VIEW_TASK: 'view_task',
  CHANGE_STATUS: 'change_status',
  DELEGATE_TASK: 'delegate_task',
  
  // Subtareas
  CREATE_SUBTASK: 'create_subtask',
  EDIT_SUBTASK: 'edit_subtask',
  DELETE_SUBTASK: 'delete_subtask',
  COMPLETE_SUBTASK: 'complete_subtask',
  
  // Reportes
  CREATE_REPORT: 'create_report',
  VIEW_ALL_REPORTS: 'view_all_reports',
  VIEW_AREA_REPORTS: 'view_area_reports',
  RATE_REPORT: 'rate_report',
  
  // Usuarios
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_USERS: 'view_all_users'
};

/**
 * Matriz de permisos por rol
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CHANGE_STATUS,
    PERMISSIONS.DELEGATE_TASK,
    PERMISSIONS.CREATE_SUBTASK,
    PERMISSIONS.EDIT_SUBTASK,
    PERMISSIONS.DELETE_SUBTASK,
    PERMISSIONS.COMPLETE_SUBTASK,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_ALL_REPORTS,
    PERMISSIONS.VIEW_AREA_REPORTS,
    PERMISSIONS.RATE_REPORT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_USERS
  ],
  
  [ROLES.SECRETARIO]: [
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.DELEGATE_TASK,      // Puede delegar a directores de su area
    PERMISSIONS.CHANGE_STATUS,      // Puede cambiar status
    PERMISSIONS.CREATE_SUBTASK,     // Puede crear subtareas
    PERMISSIONS.COMPLETE_SUBTASK,   // Puede completar subtareas
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_AREA_REPORTS,
    PERMISSIONS.RATE_REPORT         // Puede calificar reportes de su area
  ],
  
  [ROLES.DIRECTOR]: [
    PERMISSIONS.VIEW_TASK,
    // ❌ NO TIENE CHANGE_STATUS - Solo puede COMPLETAR tareas, no cambiar a cualquier status
    PERMISSIONS.COMPLETE_SUBTASK,   // Solo completar subtareas asignadas
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_AREA_REPORTS
  ]
};

/**
 * Verifica si un usuario tiene un permiso específico
 * @param {Object} user - Usuario actual {role, email, area, direcciones}
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Verifica si el usuario puede reabrir una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea a reabrir
 * @returns {Object} {canReopen: boolean, reason: string}
 */
export function canReopenTask(user, task) {
  if (!user || !user.role) {
    return { canReopen: false, reason: 'Usuario no autenticado' };
  }

  // Solo admin puede reabrir tareas
  if (user.role === ROLES.ADMIN) {
    return { canReopen: true, reason: 'Admin puede reabrir tareas' };
  }

  // Secretarios y Directores NO pueden reabrir
  return { canReopen: false, reason: 'Solo el administrador puede reabrir tareas' };
}

/**
 * Verifica si el usuario puede editar una tarea específica
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea a editar
 * @returns {Object} {canEdit: boolean, reason: string}
 */
export function canEditTask(user, task) {
  if (!user || !user.role) {
    return { canEdit: false, reason: 'Usuario no autenticado' };
  }
  
  // Solo admin puede editar tareas completamente
  if (user.role === ROLES.ADMIN) {
    return { canEdit: true, reason: 'Admin tiene permisos completos' };
  }
  
  // Secretario, Director NO pueden editar tareas
  return { canEdit: false, reason: 'Solo el administrador puede modificar tareas' };
}

/**
 * Verifica si el usuario puede asignar una subtarea de área a un directo
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea (subtarea de área)
 * @returns {Object} {canAssign: boolean, reason: string, multiAssignAllowed: boolean}
 */
export function canAssignAreaSubtask(user, task) {
  if (!user || !user.role) {
    return { canAssign: false, reason: 'Usuario no autenticado', multiAssignAllowed: false };
  }

  // Admin puede asignar de cualquier forma (incluyendo múltiples)
  if (user.role === ROLES.ADMIN) {
    return { canAssign: true, reason: 'Admin puede asignar subtareas', multiAssignAllowed: true };
  }

  // Secretarios PUEDEN asignar subtareas pero SOLO a UN director (sin multi-asignación)
  if (user.role === ROLES.SECRETARIO) {
    return { 
      canAssign: true, 
      reason: 'Secretario puede asignar subtareas a directores',
      multiAssignAllowed: false // NO permitir múltiples asignados
    };
  }

  // Otros roles no pueden
  return { canAssign: false, reason: 'No tienes permisos para asignar subtareas', multiAssignAllowed: false };
}

/**
 * Verifica si el usuario puede delegar una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea a delegar
 * @returns {Object} {canDelegate: boolean, reason: string, allowedUsers: string[]}
 */
export function canDelegateTask(user, task) {
  if (!user || !user.role) {
    return { canDelegate: false, reason: 'Usuario no autenticado', allowedUsers: [] };
  }
  
  // Admin puede delegar a cualquiera
  if (user.role === ROLES.ADMIN) {
    return { canDelegate: true, reason: 'Admin puede delegar', allowedUsers: 'all' };
  }
  
  // Secretario puede delegar cualquier tarea a sus directores adscritos
  if (user.role === ROLES.SECRETARIO) {
    // Las áreas del secretario definen qué directores puede ver en el selector
    const todasAreas = [...new Set([
      user.area,
      ...(user.direcciones || []),
      ...(user.areasPermitidas || []),
    ])].filter(Boolean);

    return {
      canDelegate: true,
      reason: 'Secretario puede delegar a sus directores adscritos',
      allowedAreas: todasAreas
    };
  }
  
  // Otros roles no pueden delegar
  return { canDelegate: false, reason: 'No tienes permisos para delegar', allowedUsers: [] };
}

/**
 * Verifica si el usuario puede crear subtareas
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea padre
 * @returns {Object} {canCreate: boolean, reason: string}
 */
export function canCreateSubtask(user, task) {
  if (!user || !user.role) {
    return { canCreate: false, reason: 'Usuario no autenticado' };
  }
  
  // Admin siempre puede
  if (user.role === ROLES.ADMIN) {
    return { canCreate: true, reason: 'Admin puede crear subtareas' };
  }
  
  // Secretario puede crear subtareas en cualquier tarea
  if (user.role === ROLES.SECRETARIO) {
    return { canCreate: true, reason: 'Secretario puede crear subtareas' };
  }
  
  // Director no puede crear subtareas
  return { canCreate: false, reason: 'No tienes permisos para crear subtareas' };
}

/**
 * Verifica si el usuario puede cambiar el status de una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea
 * @param {string} newStatus - (Opcional) Nuevo status al que se quiere cambiar
 * @returns {Object} {canChange: boolean, reason: string, allowedStatuses: string[]}
 */
export function canChangeTaskStatus(user, task, newStatus = null) {
  if (!user || !user.role) {
    return { canChange: false, reason: 'Usuario no autenticado', allowedStatuses: [] };
  }
  
  // Admin siempre puede cambiar a cualquier status
  if (user.role === ROLES.ADMIN) {
    return { canChange: true, reason: 'Admin puede cambiar status', allowedStatuses: ['pendiente', 'en_proceso', 'en_revision', 'cerrada'] };
  }
  
  const assignedTo = task.assignedTo || [];
  const isAssigned = Array.isArray(assignedTo) 
    ? assignedTo.some(email => email?.toLowerCase().trim() === user.email?.toLowerCase().trim())
    : assignedTo?.toLowerCase().trim() === user.email?.toLowerCase().trim();
  
  // 🔒 DIRECTOR: Puede iniciar y enviar a revisión, pero NO puede cerrar
  if (user.role === ROLES.DIRECTOR) {
    if (!isAssigned) {
      return { canChange: false, reason: 'Solo puedes gestionar tareas asignadas a ti', allowedStatuses: [] };
    }

    const currentStatus = task.status || 'pendiente';
    const allowedTransitions = {
      'pendiente': ['en_proceso'],   // Puede iniciar tarea
      'en_proceso': ['en_revision'], // Puede enviar a revisión
      'en_revision': [],             // Solo el admin puede cerrar
      'cerrada': []                  // NO puede reabrir
    };
    
    const allowed = allowedTransitions[currentStatus] || [];
    
    if (newStatus && !allowed.includes(newStatus)) {
      return { canChange: false, reason: `No puedes cambiar de ${currentStatus} a ${newStatus}`, allowedStatuses: allowed };
    }
    
    if (allowed.length === 0) {
      return { canChange: false, reason: 'No puedes modificar esta tarea', allowedStatuses: [] };
    }
    
    return { canChange: true, reason: 'Puedes avanzar el status de tu tarea', allowedStatuses: allowed };
  }
  
  // Secretario puede cambiar status de tareas asignadas a él, pero NO cerrar
  if (user.role === ROLES.SECRETARIO) {
    if (!isAssigned) {
      return { canChange: false, reason: 'Solo puedes gestionar tareas asignadas a ti', allowedStatuses: [] };
    }
    if (newStatus === 'cerrada') {
      return { canChange: false, reason: 'Solo el administrador puede finalizar tareas', allowedStatuses: ['pendiente', 'en_proceso', 'en_revision'] };
    }
    return { canChange: true, reason: 'Secretario puede gestionar sus tareas', allowedStatuses: ['pendiente', 'en_proceso', 'en_revision'] };
  }
  
  return { canChange: false, reason: 'No tienes permisos para cambiar el status de esta tarea', allowedStatuses: [] };
}

/**
 * Verifica si el usuario puede eliminar una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea
 * @returns {Object} {canDelete: boolean, reason: string}
 */
export function canDeleteTask(user, task) {
  if (!user || !user.role) {
    return { canDelete: false, reason: 'Usuario no autenticado' };
  }
  
  // Solo admin puede eliminar tareas
  if (user.role === ROLES.ADMIN) {
    return { canDelete: true, reason: 'Admin puede eliminar tareas' };
  }
  
  return { canDelete: false, reason: 'Solo el administrador puede eliminar tareas' };
}

/**
 * Verifica si el usuario puede crear una nueva tarea
 * @param {Object} user - Usuario actual
 * @returns {Object} {canCreate: boolean, allowedAreas: string[]}
 */
export function canCreateTask(user) {
  if (!user || !user.role) {
    return { canCreate: false, allowedAreas: [], reason: 'Usuario no autenticado' };
  }
  
  // Admin puede crear tareas en cualquier área
  if (user.role === ROLES.ADMIN) {
    return { canCreate: true, allowedAreas: 'all', reason: 'Admin puede crear tareas' };
  }
  
  // Secretario y Director NO pueden crear tareas
  return { canCreate: false, allowedAreas: [], reason: 'Solo administradores pueden crear tareas' };
}

/**
 * Obtiene el resumen de permisos para un usuario
 * @param {Object} user - Usuario actual
 * @returns {Object} Resumen de permisos
 */
export function getPermissionsSummary(user) {
  if (!user || !user.role) {
    return {
      canCreateTask: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canDelegateTasks: false,
      canCreateSubtasks: false,
      canViewAllReports: false,
      canManageUsers: false,
      role: null
    };
  }
  
  return {
    canCreateTask: hasPermission(user, PERMISSIONS.CREATE_TASK),
    canEditTasks: user.role === ROLES.ADMIN,
    canDeleteTasks: user.role === ROLES.ADMIN,
    canDelegateTasks: user.role === ROLES.ADMIN || user.role === ROLES.SECRETARIO,
    canCreateSubtasks: hasPermission(user, PERMISSIONS.CREATE_SUBTASK),
    canViewAllReports: user.role === ROLES.ADMIN,
    canManageUsers: user.role === ROLES.ADMIN,
    role: user.role
  };
}

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  canEditTask,
  canDelegateTask,
  canCreateSubtask,
  canChangeTaskStatus,
  canDeleteTask,
  canCreateTask,
  getPermissionsSummary
};
