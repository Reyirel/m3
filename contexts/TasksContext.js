// contexts/TasksContext.js
// Context global para sincronizar tareas entre todas las pantallas en tiempo real
// ⚡ Optimizado con useMemo para evitar re-renders innecesarios

import React, { createContext, useState, useEffect, useMemo } from 'react';
import logger from '../services/Logger';
import { subscribeToTasks } from '../services/tasks';
import { subscribeToConnectionState } from '../services/offlineSync';
import { deleteManager } from '../utils/deleteManager';
import { useAuth } from './AuthContext';

export const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const { user: currentUser, status: authStatus } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Conectividad: la misma fuente que el resto de la app (services/offlineSync, que usa
  // NetInfo). Antes se escuchaban los eventos online/offline de `window`, que solo
  // existen en el navegador: en iOS y Android `isOnline` nunca cambiaba.
  useEffect(() => {
    let previous = null;
    return subscribeToConnectionState((online) => {
      if (online === previous) return;
      previous = online;
      setIsOnline(online);
      // Firestore detecta por su cuenta cuándo hay red y reintenta solo. Antes aquí se
      // apagaba y encendía a mano (enableNetwork/disableNetwork); con la copia local
      // compartida entre pestañas eso puede dejarlo en un estado inválido
      // ("INTERNAL ASSERTION FAILED: Unexpected state").
    });
  }, []);

  // Suscribirse a las tareas del usuario. Se vuelve a suscribir si cambia el usuario,
  // su rol o su área, porque de eso depende qué tareas puede ver.
  const userEmail = currentUser?.email;
  const userRole = currentUser?.role;
  const userArea = currentUser?.area;
  const userDirecciones = (currentUser?.direcciones || []).join('|');
  useEffect(() => {
    if (authStatus === 'loading') return undefined;
    if (!userEmail) {
      setTasks(prev => prev.length > 0 ? [] : prev);
      setIsLoading(false);
      return undefined;
    }

    let mounted = true;
    let unsubscribe = null;
    let retryTimer = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    let hasLoadedOnce = false;
    setIsLoading(true);

    const setupSubscription = async () => {
      try {
        const unsub = await subscribeToTasks((updatedTasks) => {
          if (!mounted) return;
          setTasks(deleteManager.filterVisible(updatedTasks));

          if (!hasLoadedOnce) {
            hasLoadedOnce = true;
            setIsLoading(false);
          }

          retryCount = 0;
        }, currentUser);
        // El usuario cambió mientras se preparaba la suscripción
        if (!mounted) {
          if (typeof unsub === 'function') unsub();
          return;
        }
        unsubscribe = unsub;
      } catch (error) {
        logger.error('TasksContext', 'Failed to setup task subscription', error, {
          retryCount,
          userEmail,
        });
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          const delayMs = 500 * retryCount;
          logger.warn('TasksContext', `Retrying subscription (${retryCount}/${MAX_RETRIES}) in ${delayMs}ms`);
          retryTimer = setTimeout(() => {
            if (mounted) setupSubscription();
          }, delayMs);
        } else {
          setIsLoading(false);
          logger.error('TasksContext', 'Max retries exceeded for task subscription');
        }
      }
    };

    setupSubscription();

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          // Silent cleanup error
        }
      }
    };
    // currentUser se lee completo dentro, pero solo estos campos cambian qué tareas se ven
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, userEmail, userRole, userArea, userDirecciones]);

  // ⚡ Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    tasks,
    setTasks,
    isLoading,
    isOnline,
    currentUser,
    deleteManager,
  }), [tasks, isLoading, isOnline, currentUser]);

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
