// components/NotificationWatcher.js
// Se monta una vez en App.js. Mientras hay sesión, vigila las notificaciones del
// usuario y muestra un aviso en pantalla cuando llega una nueva. No dibuja nada.
import { useEffect } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useNotification } from '../contexts/NotificationContext';
import { watchNotifications } from '../services/notificationsLive';

export default function NotificationWatcher() {
  const { currentUser } = useTasks();
  const { showNotification } = useNotification();
  const userId = currentUser?.userId;

  useEffect(() => {
    if (!userId) return undefined;
    return watchNotifications(userId, (notification) => {
      const text = notification.body || notification.message || '';
      showNotification({
        message: text ? `${notification.title || 'Notificación'} — ${text}` : (notification.title || 'Nueva notificación'),
        type: 'info',
        duration: 5000,
        position: 'top',
      });
    });
    // showNotification es estable; solo se reinicia al cambiar de usuario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
