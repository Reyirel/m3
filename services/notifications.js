// services/notifications.js
// Helpers para programar y cancelar notificaciones locales usando expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { toDate } from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAllUsers } from './usersDirectory';

// Configurar handler de notificaciones (solo en móvil — no aplica en web)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Keys para AsyncStorage
const NOTIFICATION_TRACKING_KEY = '@notification_tracking';

// Pide permisos si es necesario. Devuelve true si se concedieron.
export async function ensurePermissions() {
  // En web no hay notificaciones nativas
  if (Platform.OS === 'web') {
    return false;
  }
  
  if (!Device.isDevice) {
    return false;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    // Configurar canal de notificaciones para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Tareas y Recordatorios',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
        sound: true,
      });
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Programa una notificación antes de la fecha límite (optimizado)
// Devuelve el id de la notificación programada o null si no se programó.
export async function scheduleNotificationForTask(task, options = { minutesBefore: 10 }) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    // Un solo recordatorio por tarea en este dispositivo: al editar la tarea se
    // reemplaza el anterior en lugar de acumularse uno por cada vez que se guardó
    if (task.id) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter(n => n.content?.data?.type === 'reminder' && n.content?.data?.taskId === task.id)
          .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    }

    const due = toDate(task.dueAt);
    if (!due) return null;
    const triggerDate = new Date(due.getTime() - options.minutesBefore * 60 * 1000);

    // Si el trigger ya pasó, no programamos
    if (triggerDate <= new Date()) {
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Recordatorio de Tarea',
        body: `"${task.title}" vence en ${options.minutesBefore} minutos`,
        data: { 
          taskId: task.id,
          type: 'reminder',
          taskTitle: task.title
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#9F2241',
      },
      trigger: triggerDate
    });

    return id;
  } catch (e) {
    return null;
  }
}

// Avisar a los asignados de una tarea (notificación dentro de la app).
// Antes se mostraba además una notificación local "Te asignaron…" en ESTE dispositivo,
// que es el de quien crea la tarea y no el de quien la recibe.
export async function notifyAssignment(task) {
  await notifyMultipleAssignees(task);
  return null;
}

// 🔔 Notificar a MÚLTIPLES asignados via Firestore (para FCM/notificaciones in-app)
async function notifyMultipleAssignees(task) {
  try {
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean);
    
    if (assignees.length === 0) return;
    
    // Obtener usuarios para los emails asignados
    const assigneeEmails = assignees.map(e => e.toLowerCase());
    const assignedUsers = [];
    
    (await getAllUsers()).forEach(userData => {
      if (assigneeEmails.includes(userData.email?.toLowerCase())) {
        assignedUsers.push(userData);
      }
    });
    
    // Crear notificación en Firestore para cada usuario asignado
    const notificationsRef = collection(db, 'notifications');
    const now = new Date();
    
    for (const user of assignedUsers) {
      await addDoc(notificationsRef, {
        userId: user.id,
        userEmail: user.email,
        type: 'task_assigned',
        title: '📋 Nueva Tarea Asignada',
        message: `Te asignaron: "${task.title}"`,
        taskId: task.id,
        taskTitle: task.title,
        dueAt: task.dueAt,
        read: false,
        createdAt: now,
        priority: task.priority || 'media'
      });
    }
  } catch (error) {
    // Silent fail - notifications are not critical
  }
}

/**
 * Programa notificaciones múltiples al día para tareas vencidas
 * Horarios: 9 AM, 2 PM, 6 PM
 * OPTIMIZADO: Solo programa 3 notificaciones máximo por día
 */
export async function scheduleMultipleDailyOverdueNotifications(overdueTasks) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
  if (!overdueTasks || overdueTasks.length === 0) {
    return [];
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return [];
    }

    // NO cancelar todas las notificaciones, solo limpiar las viejas de tipo overdue
    // Esto es más eficiente que iterar todas
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const overduesToCancel = allScheduled
      .filter(n => n.content.data?.type === 'overdue_daily' || n.content.data?.type === 'overdue_multiple')
      .slice(0, 20); // Limitar a 20 para evitar lag
    
    for (const notif of overduesToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    const count = overdueTasks.length;
    const taskTitles = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
    const moreText = count > 3 ? `\n... y ${count - 3} más` : '';

    const ids = [];
    const hours = [9, 14, 18]; // 9 AM, 2 PM, 6 PM
    const now = new Date();

    for (const hour of hours) {
      const triggerTime = new Date();
      triggerTime.setHours(hour, 0, 0, 0);
      
      // Si ya pasó la hora de hoy, programar para mañana
      if (triggerTime <= now) {
        triggerTime.setDate(triggerTime.getDate() + 1);
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠ ${count} ${count === 1 ? 'Tarea Vencida' : 'Tareas Vencidas'}`,
          body: `Tienes ${count} ${count === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}:\n${taskTitles}${moreText}`,
          data: { 
            type: 'overdue_multiple',
            taskCount: count,
            taskIds: overdueTasks.map(t => t.id),
            hour
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: '#DC2626',
          badge: count,
          vibrate: [0, 250, 250, 250], // Vibración más insistente
        },
        trigger: triggerTime
      });

      ids.push(id);
    }

    return ids;
  } catch (e) {
    return [];
  }
}

export async function cancelNotification(notificationId) {
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    if (!notificationId) {
      return;
    }
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // Error silencioso
  }
}

// Obtener todas las notificaciones programadas (útil para debugging)
export async function getAllScheduledNotifications() {
  // En web no hay notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    notifications.forEach(_notif => {
    });
    return notifications;
  } catch (e) {
    if (__DEV__) console.error('Error obteniendo notificaciones:', e);
    return [];
  }
}

// Cancelar TODAS las notificaciones programadas
export async function cancelAllNotifications() {
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    if (__DEV__) console.error('Error cancelando todas las notificaciones:', e);
  }
}

// ========================================
// NUEVAS FUNCIONALIDADES AGREGADAS
// ========================================

/**
 * SISTEMA DE CONFIRMACIÓN OBLIGATORIA
 * Tracking de notificaciones vistas y reprogramación si no se confirma
 */

// Marcar notificación como confirmada
export async function confirmNotificationViewed(taskId) {
  try {
    const tracking = await AsyncStorage.getItem(NOTIFICATION_TRACKING_KEY);
    if (!tracking) return;
    
    const data = JSON.parse(tracking);
    if (data[taskId]) {
      data[taskId].confirmed = true;
      data[taskId].confirmedAt = Date.now();
      data[taskId].viewCount += 1;
      await AsyncStorage.setItem(NOTIFICATION_TRACKING_KEY, JSON.stringify(data));
    }
  } catch (e) {
    if (__DEV__) console.error('Error confirmando notificación:', e);
  }
}

// Setup del listener de respuestas (llamar al iniciar la app)
export function setupNotificationResponseListener() {
  if (Platform.OS === 'web') return;
  
  const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { notification, actionIdentifier } = response;
    const { taskId } = notification.request.content.data;
    
    
    // Confirmar visualización
    if (taskId) {
      await confirmNotificationViewed(taskId);
    }
    
    // Manejar acciones específicas
    if (actionIdentifier === 'COMPLETE') {
      // Aquí puedes agregar lógica para marcar la tarea como completa
    } else if (actionIdentifier === 'SNOOZE') {
      // Reprogramar para 1 hora después
    } else if (actionIdentifier === 'VIEW') {
      // Navegar a la pantalla de la tarea
    }
  });
  
  return subscription;
}

