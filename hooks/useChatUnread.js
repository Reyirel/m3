/**
 * hooks/useChatUnread.js
 * Indica si el chat de una tarea tiene mensajes sin leer para el usuario actual.
 */

import { useEffect, useState } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { hasUnreadChat, subscribeToChatRead } from '../services/chatService';

export function useChatUnread(task) {
  const { currentUser } = useTasks();
  // Cambia cada vez que el usuario lee un chat, para recalcular el indicador
  const [, setVersion] = useState(0);

  useEffect(() => subscribeToChatRead(() => setVersion(v => v + 1)), []);

  return hasUnreadChat(task, currentUser);
}

export default useChatUnread;
