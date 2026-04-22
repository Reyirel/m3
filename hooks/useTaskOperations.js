/**
 * useTaskOperations.js
 * 
 * Hook que centraliza todas las operaciones de tarea:
 * - Save (create/update)
 * - Delete
 * - Update fields
 * - Firebase integration
 */

import { useState, useCallback } from 'react';
import { updateTask } from '../services/tasks';
import { addSubtask, updateTaskMultiple } from '../services/tasksMultiple';
import { useNotification } from '../contexts/NotificationContext';
import { useTaskCreation } from '../hooks/useTaskCreation';

/**
 * Hook para realizar operaciones en tareas
 * 
 * @param {Object} task - Tarea a editar (null para crear nueva)
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} { save, delete, update, isSaving, error }
 */
export const useTaskOperations = (task, currentUser) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotification();
  const { saveTask, deleteTask: deleteTaskFromCreation } = useTaskCreation();

  /**
   * Guarda una tarea (crear o actualizar)
   * Validaciones incluidas
   */
  const save = useCallback(
    async (taskData) => {
      if (isSaving) return false;

      try {
        setIsSaving(true);
        setSaveProgress(0);
        setError(null);

        // Validaciones básicas
        if (!taskData.title?.trim()) {
          throw new Error('El título es obligatorio');
        }
        if (taskData.title.trim().length < 3) {
          throw new Error('El título debe tener al menos 3 caracteres');
        }
        if (taskData.title.trim().length > 100) {
          throw new Error('El título no puede tener más de 100 caracteres');
        }

        if (!taskData.description?.trim()) {
          throw new Error('La descripción es obligatoria');
        }
        if (taskData.description.trim().length < 10) {
          throw new Error('La descripción debe tener al menos 10 caracteres');
        }

        if (!taskData.selectedAssignees || taskData.selectedAssignees.length === 0) {
          throw new Error('Debes asignar la tarea a al menos una persona');
        }

        if (!taskData.selectedAreas || taskData.selectedAreas.length === 0) {
          throw new Error('Debes seleccionar al menos una área');
        }

        // Simular progreso
        const progressInterval = setInterval(() => {
          setSaveProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        // Guardar tarea
        const result = await saveTask({
          ...taskData,
          createdBy: currentUser?.email,
          createdAt: task ? undefined : new Date(),
          updatedBy: currentUser?.email,
          updatedAt: new Date(),
        });

        setSaveProgress(100);
        clearInterval(progressInterval);

        // Crear subtareas de IA si es nueva y hay pendientes
        if (!task && taskData.aiPendingSubtasks?.length > 0) {
          await Promise.all(
            taskData.aiPendingSubtasks.map((subtaskTitle) =>
              addSubtask(result.id, {
                title: subtaskTitle,
                description: `Subtarea generada por IA`,
                assignedTo: taskData.selectedAssignees[0]?.email,
                area: taskData.selectedAreas[0],
              })
            )
          );
        }

        showSuccess(task ? '¡Tarea actualizada!' : '¡Tarea creada!');
        setIsSaving(false);
        return result;
      } catch (err) {
        setError(err.message);
        showError(err.message);
        setIsSaving(false);
        return false;
      }
    },
    [isSaving, task, currentUser, saveTask, showSuccess, showError]
  );

  /**
   * Elimina una tarea (solo admin)
   */
  const deleteTask = useCallback(
    async (taskId) => {
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Solo administradores pueden eliminar tareas');
      }

      try {
        setIsSaving(true);
        await deleteTaskFromCreation(taskId);
        showSuccess('Tarea eliminada');
        setIsSaving(false);
        return true;
      } catch (err) {
        setError(err.message);
        showError(err.message);
        setIsSaving(false);
        return false;
      }
    },
    [currentUser, deleteTaskFromCreation, showSuccess, showError]
  );

  /**
   * Actualiza un campo específico de la tarea
   */
  const updateField = useCallback(
    async (taskId, field, value) => {
      try {
        setIsSaving(true);
        await updateTask(taskId, {
          [field]: value,
          updatedAt: new Date(),
          updatedBy: currentUser?.email,
        });
        setIsSaving(false);
        return true;
      } catch (err) {
        setError(err.message);
        showError(err.message);
        setIsSaving(false);
        return false;
      }
    },
    [currentUser, showError]
  );

  /**
   * Actualiza múltiples campos
   */
  const updateMultipleFields = useCallback(
    async (taskId, updates) => {
      try {
        setIsSaving(true);
        await updateTaskMultiple(taskId, {
          ...updates,
          updatedAt: new Date(),
          updatedBy: currentUser?.email,
        });
        setIsSaving(false);
        return true;
      } catch (err) {
        setError(err.message);
        showError(err.message);
        setIsSaving(false);
        return false;
      }
    },
    [currentUser, showError]
  );

  return {
    save,
    deleteTask,
    updateField,
    updateMultipleFields,
    isSaving,
    saveProgress,
    error,
  };
};

export default useTaskOperations;
