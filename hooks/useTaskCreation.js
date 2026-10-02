/**
 * ============================================
 * useTaskCreation HOOK
 * ============================================
 * 
 * Hook que encapsula toda la lógica de creación/edición de tareas
 * Reemplaza el código disperso en TaskDetailScreen.save()
 * 
 * USO EN COMPONENTE:
 *   const { saveTask, isLoading } = useTaskCreation();
 *   
 *   const handleSave = async () => {
 *     const result = await saveTask({
 *       title, description, selectedAssignees, selectedAreas,
 *       priority, status, dueAt, tags, estimatedHours, isRecurring
 *     }, editingTask);
 *     
 *     if (result.success) {
 *       navigation.goBack();
 *     } else {
 *       showToast(result.error);
 *     }
 *   };
 */

import { useState } from 'react';
import TaskCreator from '../services/TaskCreator';
import { updateTask } from '../services/tasks';
import { getCurrentSession } from '../services/authFirestore';
import { scheduleNotificationForTask, cancelNotification } from '../services/notifications';
import {
  canEditTask,
  canChangeTaskStatus,
} from '../services/permissions';

/**
 * Hook para manejo simplificado de creación/edición de tareas
 */
export function useTaskCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Guardar tarea (crear o actualizar)
   * 
   * @param {Object} formData - Datos del formulario
   * @param {Object} editingTask - Task a editar (null si es nueva)
   * @returns {Promise<{success: boolean, taskId?: string, error?: string}>}
   */
  const saveTask = async (formData, editingTask = null) => {
    try {
      setIsLoading(true);
      setProgress(10);

      // OBTENER SESIÓN
      const sessionResult = await getCurrentSession();
      if (!sessionResult.success) {
        return { success: false, error: 'No autenticado' };
      }

      const currentUser = sessionResult.session;
      setProgress(20);

      // ============================================
      // LÓGICA DE PERMISOS (especial para actualizar)
      // ============================================

      if (editingTask) {
        // SECRETARIO y DIRECTOR: solo pueden cambiar el status, y solo las transiciones
        // que les permite su rol. Se escribe únicamente ese campo: reenviar la tarea
        // completa por TaskCreator.update reescribía asignados y avance.
        if (currentUser.role === 'secretario' || currentUser.role === 'director') {
          const statusPermission = canChangeTaskStatus(
            currentUser,
            editingTask,
            formData.status
          );
          if (!statusPermission.canChange) {
            setIsLoading(false);
            return {
              success: false,
              error: statusPermission.reason || 'Permiso insuficiente',
            };
          }
          await updateTask(editingTask.id, { status: formData.status });
          setProgress(100);
          setIsLoading(false);
          return { success: true, taskId: editingTask.id };
        }

        // ADMIN: chequear permisos generales
        const editPermission = canEditTask(currentUser, editingTask);
        if (!editPermission.canEdit) {
          return {
            success: false,
            error: editPermission.reason,
          };
        }
      }

      setProgress(30);

      // ============================================
      // CREAR O ACTUALIZAR
      // ============================================

      let result;

      if (editingTask) {
        // ACTUALIZAR
        result = await TaskCreator.update(editingTask.id, {
          title: formData.title,
          description: formData.description,
          assignedEmails: formData.selectedAssignees.map((a) =>
            a.email?.toLowerCase().trim()
          ),
          areas: formData.selectedAreas,
          area: formData.selectedAreas[0],
          priority: formData.priority,
          status: formData.status,
          dueAt: formData.dueAt.getTime(),
          tags: formData.tags || [],
          estimatedHours: formData.estimatedHours
            ? parseFloat(formData.estimatedHours)
            : null,
          isRecurring: formData.isRecurring || false,
          recurrencePattern: formData.recurrencePattern || null,
        });

        // Cancelar notificación previa si existía
        if (editingTask.notificationId) {
          try {
            await cancelNotification(editingTask.notificationId);
          } catch (e) {
            console.warn('Error cancelando notificación:', e);
          }
        }
      } else {
        // CREAR
        result = await TaskCreator.create({
          title: formData.title,
          description: formData.description,
          assignedEmails: formData.selectedAssignees.map((a) =>
            a.email?.toLowerCase().trim()
          ),
          areas: formData.selectedAreas,
          area: formData.selectedAreas[0],
          priority: formData.priority,
          status: formData.status,
          dueAt: formData.dueAt.getTime(),
          tags: formData.tags || [],
          estimatedHours: formData.estimatedHours
            ? parseFloat(formData.estimatedHours)
            : null,
          isRecurring: formData.isRecurring || false,
          recurrencePattern: formData.recurrencePattern || null,
        });
      }

      setProgress(80);

      // ============================================
      // PROGRAMAR NOTIFICACIONES (async, no bloquea)
      // ============================================

      if (result.success) {
        try {
          // Programar recordatorio 10 minutos antes del vencimiento
          if (formData.status !== 'cerrada') {
            scheduleNotificationForTask(
              {
                id: result.taskId,
                title: formData.title,
                dueAt: formData.dueAt.getTime(),
              },
              { minutesBefore: 10 }
            ).catch((e) => console.warn('Error scheduling notification:', e));
          }
        } catch (e) {
          console.warn('Notification error (no critical):', e);
        }
      }

      setProgress(100);
      setIsLoading(false);

      return result;
    } catch (error) {
      console.error('useTaskCreation error:', error);
      setIsLoading(false);
      return {
        success: false,
        error: error.message || 'Error guardando tarea',
      };
    }
  };

  /**
   * Eliminar tarea
   */
  const deleteTask = async (taskId) => {
    try {
      setIsLoading(true);
      setProgress(50);

      const result = await TaskCreator.delete(taskId);

      setProgress(100);
      setIsLoading(false);

      return result;
    } catch (error) {
      console.error('useTaskCreation delete error:', error);
      setIsLoading(false);
      return {
        success: false,
        error: error.message || 'Error eliminando tarea',
      };
    }
  };

  return {
    saveTask,
    deleteTask,
    isLoading,
    progress,
  };
}

export default useTaskCreation;
