// screens/inbox/useTaskDeletion.js
// Eliminar tareas desde la bandeja (solo admin). La tarea se marca "eliminando", se
// quita de la lista y se manda a la papelera en segundo plano. Las que estaban en
// proceso se guardan en el dispositivo para terminar de eliminarlas si la app se recarga.
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteTask as deleteTaskFirebase } from '../../services/tasks';
import { deleteManager } from '../../utils/deleteManager';

const STORAGE_KEY = 'deletingTasks';
// Tiempo para que se vea el indicador "eliminando" antes de quitar la tarea de la lista
const SINGLE_DELAY_MS = 600;
const BULK_DELAY_MS = 800;

const saveDeleting = async (taskIds) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(taskIds)));
  } catch {
    // Guardarlo es opcional
  }
};

/**
 * @param {Object} options
 * @param {Object|null} options.currentUser
 * @param {Function} options.setTasks - setTasks del contexto de tareas
 * @param {Object} options.notify - { showSuccess, showError, showWarning, showInfo }
 */
export function useTaskDeletion({ currentUser, setTasks, notify }) {
  const [deletingTaskIds, setDeletingTaskIds] = useState(new Set());
  // Evita eliminar la misma tarea dos veces
  const deletingRef = useRef(new Set());
  const mountedRef = useRef(true);
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  useEffect(() => () => { mountedRef.current = false; }, []);

  const unmark = useCallback((taskIds) => {
    taskIds.forEach((id) => deletingRef.current.delete(id));
    setDeletingTaskIds((prev) => {
      const updated = new Set(prev);
      taskIds.forEach((id) => updated.delete(id));
      return updated;
    });
  }, []);

  const removeFromListLater = useCallback((taskIds, delay) => {
    setTimeout(() => {
      if (mountedRef.current) setTasks((prev) => prev.filter((task) => !taskIds.has(task.id)));
    }, delay);
  }, [setTasks]);

  // Al abrir la bandeja: terminar las eliminaciones que quedaron a medias
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const taskIds = JSON.parse(stored);
        const idSet = new Set(taskIds);
        deletingRef.current = idSet;
        setDeletingTaskIds(idSet);
        // Que no reaparezcan en la lista
        setTasks((prev) => prev.filter((task) => !idSet.has(task.id)));

        taskIds.forEach((taskId) => {
          deleteTaskFirebase(taskId)
            .catch(() => {})
            .finally(() => unmark([taskId]));
        });
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {
        // Sin lo guardado se sigue con la lista tal cual
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    if (deletingRef.current.has(taskId)) return;
    if (currentUser?.role !== 'admin') {
      notifyRef.current.showError(`Solo admins pueden eliminar. Tu rol: ${currentUser?.role || 'desconocido'}`);
      return;
    }

    deletingRef.current.add(taskId);
    setDeletingTaskIds((prev) => new Set([...prev, taskId]));
    // Evita que el listener de tareas la vuelva a poner en la lista
    deleteManager.markDeleting(taskId);
    await saveDeleting(deletingRef.current);

    notifyRef.current.showInfo('Eliminando tarea, espera un momento...');
    removeFromListLater(new Set([taskId]), SINGLE_DELAY_MS);

    deleteTaskFirebase(taskId)
      .then(() => {
        notifyRef.current.showSuccess('✅ ¡TAREA ELIMINADA! Ya no aparecerá');
        deleteManager.confirmDelete(taskId);
      })
      // Si falla se deja marcada en deleteManager para que no reaparezca
      .catch(() => notifyRef.current.showError('Error: No se pudo eliminar la tarea'))
      .finally(() => unmark([taskId]));
  }, [currentUser, removeFromListLater, unmark]);

  /**
   * Eliminar varias tareas a la vez.
   * @param {Set<string>} selectedIds
   * @param {Function} [onDone] - Se llama cuando termina (para limpiar la selección)
   */
  const deleteTasks = useCallback(async (selectedIds, onDone) => {
    if (selectedIds.size === 0) {
      notifyRef.current.showWarning('⚠️ Selecciona al menos una tarea');
      return;
    }
    if (currentUser?.role !== 'admin') {
      notifyRef.current.showError('❌ Solo admins pueden eliminar tareas');
      return;
    }

    const ids = Array.from(selectedIds);
    const idSet = new Set(ids);
    notifyRef.current.showInfo(`🔴 ¡ELIMINANDO ${ids.length} TAREA${ids.length > 1 ? 'S' : ''}! Espera...`);

    const deleting = new Set([...deletingRef.current, ...ids]);
    deletingRef.current = deleting;
    setDeletingTaskIds(deleting);
    ids.forEach((taskId) => deleteManager.markDeleting(taskId));
    await saveDeleting(deleting);

    removeFromListLater(idSet, BULK_DELAY_MS);

    const results = await Promise.all(ids.map((taskId) => deleteTaskFirebase(taskId)
      .then(() => {
        deleteManager.confirmDelete(taskId);
        return true;
      })
      // Las que fallan quedan marcadas en deleteManager para que no reaparezcan
      .catch(() => false)));

    const done = results.filter(Boolean).length;
    notifyRef.current.showSuccess(`✅ ¡${done} TAREA${done > 1 ? 'S' : ''} ELIMINADA${done > 1 ? 'S' : ''}! Ya no aparecerán`);
    onDone?.();
    unmark(ids);
  }, [currentUser, removeFromListLater, unmark]);

  return { deletingTaskIds, deleteTask, deleteTasks };
}
