// services/notifications.js
// Helpers para programar y cancelar notificaciones locales usando expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { toDate, toMs } from '../utils/dateUtils';
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
const ESCALATION_LEVEL_KEY = '@escalation_level';

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

// Programa recordatorios diarios cada 24 horas para tareas no cerradas
// 🔔 RECORDATORIOS ESCALONADOS: 24h, 12h, 2h antes del vencimiento
// Notificación al asignar tarea (Local optimizada + FCM para múltiples asignados)
export async function notifyAssignment(task) {
  // En web no enviar notificaciones locales
  if (Platform.OS === 'web') {
    // Pero sí intentar notificar via FCM a los asignados
    await notifyMultipleAssignees(task);
    return null;
  }
  
  try {
    // Notificación local para el dispositivo actual
    const localNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Nueva Tarea Asignada',
        body: `Te asignaron: "${task.title}" - Vence: ${new Date(toMs(task.dueAt)).toLocaleDateString()}`,
        data: { 
          taskId: task.id, 
          type: 'assignment',
          taskTitle: task.title,
          assignedTo: task.assignedTo
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#9F2241',
      },
      trigger: null // Notificación inmediata
    });

    // También notificar via FCM a los demás asignados
    await notifyMultipleAssignees(task);

    return localNotifId;
  } catch (e) {
    return null;
  }
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

// Notificación diaria de tareas vencidas (se programa cada 24 horas)
export async function scheduleOverdueTasksNotification(overdueTasks) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return null;
  }
  
  // No notificar si no hay tareas vencidas
  if (!overdueTasks || overdueTasks.length === 0) {
    return null;
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return null;
    }

    // Cancelar notificaciones previas de este tipo
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of allScheduled) {
      if (notif.content.data?.type === 'overdue_daily') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const count = overdueTasks.length;
    const taskTitles = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
    const moreText = count > 3 ? `\n... y ${count - 3} más` : '';

    // Programar notificación para mañana a las 9:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ${count} ${count === 1 ? 'Tarea Vencida' : 'Tareas Vencidas'}`,
        body: `Tienes ${count} ${count === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}:\n${taskTitles}${moreText}`,
        data: { 
          type: 'overdue_daily',
          taskCount: count,
          taskIds: overdueTasks.map(t => t.id)
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#DC2626',
        badge: count
      },
      trigger: tomorrow
    });

    return id;
  } catch (e) {
    return null;
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
    const taskTitles = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\\n');
    const moreText = count > 3 ? `\\n... y ${count - 3} más` : '';

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
          body: `Tienes ${count} ${count === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}:\\n${taskTitles}${moreText}`,
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

// Guardar que se envió una notificación
async function trackNotificationSent(taskId, notificationId) {
  try {
    const tracking = await AsyncStorage.getItem(NOTIFICATION_TRACKING_KEY);
    const data = tracking ? JSON.parse(tracking) : {};
    
    data[taskId] = {
      notificationId,
      sentAt: Date.now(),
      confirmed: false,
      viewCount: 0
    };
    
    await AsyncStorage.setItem(NOTIFICATION_TRACKING_KEY, JSON.stringify(data));
  } catch (e) {
    if (__DEV__) console.error('Error guardando tracking:', e);
  }
}

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

/**
 * SISTEMA DE ESCALADO DE NOTIFICACIONES
 * Aumenta intensidad y frecuencia si el usuario no responde
 */

// Obtener nivel de escalado actual
async function getEscalationLevel(taskId) {
  try {
    const data = await AsyncStorage.getItem(`${ESCALATION_LEVEL_KEY}_${taskId}`);
    return data ? parseInt(data) : 0;
  } catch (e) {
    return 0;
  }
}

// Incrementar nivel de escalado
async function incrementEscalationLevel(taskId) {
  try {
    const currentLevel = await getEscalationLevel(taskId);
    const newLevel = Math.min(currentLevel + 1, 5); // Máximo nivel 5
    await AsyncStorage.setItem(`${ESCALATION_LEVEL_KEY}_${taskId}`, newLevel.toString());
    return newLevel;
  } catch (e) {
    if (__DEV__) console.error('Error incrementando escalado:', e);
    return 0;
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

