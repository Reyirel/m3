/**
 * useTaskPermissions.js
 * 
 * Hook personalizado para gestionar permisos de tareas
 * Centraliza toda la lógica de canEdit, isReadOnly, canDelegate, etc.
 */

import { useState, useEffect } from 'react';
import {
  canEditTask,
  canDelegateTask,
  canCreateSubtask,
  canCreateTask,
} from '../services/permissions';

/**
 * Hook para calcular permisos de una tarea
 * 
 * @param {Object} task - La tarea actual (null para nueva tarea)
 * @param {Object} currentUser - Usuario autenticado
 * @param {string} userRole - Rol del usuario (admin, secretario, director)
 * @returns {Object} Objeto con permisos { canEdit, isReadOnly, canDelegate, canAddSubtask }
 */
export const useTaskPermissions = (task, currentUser, userRole = 'admin') => {
  const [permissions, setPermissions] = useState({
    canEdit: false,
    isReadOnly: false,
    canDelegate: false,
    canAddSubtask: false,
    canDelete: false,
    createPermission: null,
    delegatePermission: null,
  });

  useEffect(() => {
    if (!currentUser) return;

    // Para NUEVA tarea (task es null/undefined)
    if (!task) {
      const createPerm = canCreateTask(currentUser);
      setPermissions({
        canEdit: createPerm.canCreate,
        isReadOnly: !createPerm.canCreate,
        canDelegate: false,
        canAddSubtask: false,
        canDelete: false,
        createPermission: createPerm,
        delegatePermission: null,
      });
    } else {
      // Para TAREA EXISTENTE
      const editPerm = canEditTask(currentUser, task);
      const delegatePerm = canDelegateTask(currentUser, task);
      const subtaskPerm = canCreateSubtask(currentUser, task);

      // Read-only para director y secretario
      const isReadOnlyMode = userRole === 'director' || userRole === 'secretario';

      setPermissions({
        canEdit: editPerm.canEdit && !isReadOnlyMode,
        isReadOnly: isReadOnlyMode,
        canDelegate: delegatePerm.canDelegate,
        canAddSubtask: subtaskPerm.canCreate,
        canDelete: userRole === 'admin',
        createPermission: null,
        delegatePermission: delegatePerm,
      });
    }
  }, [task, currentUser, userRole]);

  return permissions;
};

export default useTaskPermissions;
