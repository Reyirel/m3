// screens/inbox/useRecentMessages.js
// Últimos mensajes de chat de las tareas del usuario, escritos por otras personas.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toMs } from '../../utils/dateUtils';
import { isTaskAssignedToUser } from '../../utils/taskHelpers';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_TASKS = 10;
const MESSAGES_PER_TASK = 3;
const MAX_MESSAGES = 5;

// Tareas en las que participa el usuario; el admin completa la lista con otras
const tasksToCheck = (tasks, user) => {
  const email = user.email?.toLowerCase().trim() || '';
  const isMine = (task) => isTaskAssignedToUser(task, email) || task.createdBy?.toLowerCase().trim() === email;
  const valid = tasks.filter((task) => task && task.id);

  let selected = valid.filter(isMine);
  if (user.role === 'admin' && selected.length < MAX_TASKS) {
    selected = [...selected, ...valid.filter((task) => !isMine(task)).slice(0, MAX_TASKS - selected.length)];
  }
  return selected.slice(0, MAX_TASKS);
};

export function useRecentMessages(tasks, currentUser) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!currentUser?.email || !db || tasks.length === 0) return;

    const cacheKey = `@inbox_messages_${currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const load = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS) {
            setMessages(data);
            return;
          }
        }

        const found = [];
        for (const task of tasksToCheck(tasks, currentUser)) {
          try {
            const messagesRef = collection(db, 'tasks', task.id, 'messages');
            const snapshot = await getDocs(query(messagesRef, orderBy('createdAt', 'desc'), limit(MESSAGES_PER_TASK)));
            snapshot.forEach((messageDoc) => {
              const data = messageDoc.data();
              const hasText = data && typeof data.text === 'string' && data.text.trim() !== '';
              const fromOther = data?.author && data.author !== currentUser.displayName && data.author !== currentUser.email;
              if (hasText && fromOther) {
                found.push({
                  id: `${messageDoc.id}-${Date.now()}`,
                  taskId: task.id,
                  taskTitle: task.title || 'Sin título',
                  author: data.author,
                  text: data.text,
                  createdAt: data.createdAt || null,
                });
              }
            });
          } catch {
            // Una tarea que no se puede leer no impide mostrar los mensajes de las demás
          }
        }

        const recent = found
          .sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0))
          .slice(0, MAX_MESSAGES);
        setMessages(recent);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ data: recent, timestamp: Date.now() })).catch(() => {});
      } catch {
        setMessages([]);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, tasks.length]);

  return messages;
}
