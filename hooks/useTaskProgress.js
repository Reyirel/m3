// hooks/useTaskProgress.js
// Hook personalizado para acceder a progreso de tareas en tiempo real
import { useState, useEffect } from 'react';
import { subscribeToTaskProgress, subscribeToMultipleTasksProgress } from '../services/taskProgress';

/**
 * Hook para obtener progreso de una tarea en tiempo real
 * @param {string} taskId - ID de la tarea
 * @returns {Object} {progressData, loading, error}
 */
export function useTaskProgress(taskId) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = subscribeToTaskProgress(taskId, (data) => {
        setProgressData(data);
        setLoading(false);
        setError(null);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [taskId]);

  return { progressData, loading, error };
}

/**
 * Hook para obtener progreso de múltiples tareas
 * @param {Array<string>} taskIds - Array de IDs de tareas
 * @returns {Object} {progressList, loading, error}
 */
export function useMultipleTasksProgress(taskIds) {
  const [progressList, setProgressList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const taskIdsKey = taskIds?.join(',');

  useEffect(() => {
    if (!taskIds || taskIds.length === 0) {
      setProgressList([]);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = subscribeToMultipleTasksProgress(taskIds, (data) => {
        setProgressList(data);
        setLoading(false);
        setError(null);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [taskIdsKey, taskIds]); // Recalcular cuando cambian los IDs

  return { progressList, loading, error };
}

export default {
  useTaskProgress,
  useMultipleTasksProgress
};
