// contexts/TasksContext.js
// Context global para sincronizar tareas entre todas las pantallas en tiempo real
// ⚡ Optimizado con useMemo para evitar re-renders innecesarios

import React, { createContext, useState, useEffect, useRef, useMemo } from 'react';
import logger from '../services/Logger';
import { subscribeToTasks } from '../services/tasks';
import { getCurrentSession } from '../services/authFirestore';
import { deleteManager } from '../utils/deleteManager';

// Usar globalThis para que React.lazy() bundles compartan la misma instancia de contexto
if (!globalThis.__TASKS_CONTEXT__) {
  globalThis.__TASKS_CONTEXT__ = createContext();
}
export const TasksContext = globalThis.__TASKS_CONTEXT__;

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const unsubscribeTasksRef = useRef(null);

  // 🔍 EFECTO 1: Verificar disponibilidad de sesión (con reintentos)
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    const MAX_CHECKS = 30; // 3 segundos a 100ms por check

    const checkSession = async () => {
      let sessionFound = false;
      while (mounted && checkCount < MAX_CHECKS) {
        const sessionResult = await getCurrentSession();
        if (!mounted) return;
        if (sessionResult.success) {
          setCurrentUser(sessionResult.session);
          setHasSession(true);
          return; // Sesión encontrada, terminar loop
        }
        checkCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Si se alcanza MAX_CHECKS sin sesión, marcar como listo
      if (mounted && !sessionFound) {
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔍 EFECTO 2: Suscribirse al listener SOLO cuando hay sesión
  useEffect(() => {
    if (!hasSession || !currentUser?.email) {
      setTasks(prev => prev.length > 0 ? [] : prev);
      setIsLoading(true);
      return;
    }

    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const hasLoadedOnce = { current: false };

    const setupSubscription = async () => {
      try {
        unsubscribeTasksRef.current = await subscribeToTasks((updatedTasks) => {
          if (!mounted) return;
          const visibleTasks = deleteManager.filterVisible(updatedTasks);
          setTasks(visibleTasks);

          if (!hasLoadedOnce.current) {
            hasLoadedOnce.current = true;
            setIsLoading(false);
          }

          retryCount = 0;
        });
      } catch (error) {
        logger.error('TasksContext', 'Failed to setup task subscription', error, {
          retryCount,
          userEmail: currentUser?.email,
        });
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          const delayMs = 500 * retryCount;
          logger.warn('TasksContext', `Retrying subscription (${retryCount}/${MAX_RETRIES}) in ${delayMs}ms`);
          setTimeout(() => {
            if (mounted) setupSubscription();
          }, delayMs);
        } else {
          setIsLoading(false);
          logger.error('TasksContext', 'Max retries exceeded for task subscription');
        }
      }
    };

    setupSubscription();

    // Limpiar al desmontar
    return () => {
      mounted = false;
      if (unsubscribeTasksRef.current && typeof unsubscribeTasksRef.current === 'function') {
        try {
          unsubscribeTasksRef.current();
        } catch (e) {
          // Silent cleanup error
        }
      }
    };
  }, [hasSession, currentUser?.email]);

  // ⚡ Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    tasks,
    setTasks,
    isLoading,
    currentUser,
    deleteManager, // Expose deleteManager for delete operations
  }), [tasks, isLoading, currentUser]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// Hook personalizado para usar el contexto de tareas
export function useTasks() {
  const context = React.useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe estar dentro de TasksProvider');
  }
  return context;
}
