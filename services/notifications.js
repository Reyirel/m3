// services/notifications.js
// Helpers para programar y cancelar notificaciones locales usando expo-notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { toDate, toMs } from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
// Devuelve array de IDs de notificaciones programadas
export async function scheduleDailyReminders(task, maxReminders = 3) {
  // En web no programar notificaciones
  if (Platform.OS === 'web') {
    return [];
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return [];
    }

    // Solo programar para tareas que no están cerradas
    if (task.status === 'cerrada') {
      return [];
    }

    const ids = [];
    const now = new Date();
    const due = toDate(task.dueAt);
    if (!due) return [];
    
    // Programar recordatorios cada 24 horas hasta la fecha de vencimiento (máximo 3)
    let reminderDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 día
    let count = 0;
    
    while (reminderDate < due && count < maxReminders) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Recordatorio Diario',
          body: `Tarea pendiente: "${task.title}" (Vence: ${due.toLocaleDateString()})`,
          data: { 
            taskId: task.id, 
            type: 'daily_reminder',
            taskTitle: task.title
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#667eea',
        },
        trigger: reminderDate
      });
      
      ids.push(id);
      reminderDate = new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000); // +1 día más
      count++;
    }

    return ids;
  } catch (e) {
    return [];
  }
}

// 🔔 RECORDATORIOS ESCALONADOS: 24h, 12h, 2h antes del vencimiento
// Programa múltiples notificaciones en intervalos específicos antes del deadline
export async function scheduleEscalatedReminders(task) {
  if (Platform.OS === 'web') {
    return { scheduled: [], escalationLevel: 0 };
  }
  
  try {
    const granted = await ensurePermissions();
    if (!granted) {
      return { scheduled: [], escalationLevel: 0 };
    }

    if (task.status === 'cerrada') {
      return { scheduled: [], escalationLevel: 0 };
    }

    const now = new Date();
    const due = toDate(task.dueAt);
    if (!due) return { scheduled: [], escalationLevel: 0 };
    const scheduled = [];
    
    // Intervalos de recordatorio: 24h, 12h, 2h antes
    const intervals = [
      { hours: 24, emoji: '📅', urgency: 'normal', message: 'vence mañana' },
      { hours: 12, emoji: '⏰', urgency: 'medium', message: 'vence en 12 horas' },
      { hours: 2, emoji: '🚨', urgency: 'urgent', message: 'vence en 2 horas' },
    ];

    for (const interval of intervals) {
      const triggerTime = new Date(due.getTime() - (interval.hours * 60 * 60 * 1000));
      
      // Solo programar si el trigger está en el futuro
      if (triggerTime > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${interval.emoji} Recordatorio: ${interval.message}`,
            body: `"${task.title}" - ${interval.urgency === 'urgent' ? '¡Actúa ahora!' : 'No olvides completarla'}`,
            data: { 
              taskId: task.id,
              type: 'escalated_reminder',
              urgency: interval.urgency,
              hoursUntilDue: interval.hours,
              taskTitle: task.title
            },
            sound: true,
            priority: interval.urgency === 'urgent' 
              ? Notifications.AndroidNotificationPriority.MAX 
              : Notifications.AndroidNotificationPriority.HIGH,
            color: interval.urgency === 'urgent' ? '#DC2626' : 
                   interval.urgency === 'medium' ? '#F59E0B' : '#667eea',
          },
          trigger: triggerTime
        });
        
        scheduled.push({
          id,
          hours: interval.hours,
          triggerTime: triggerTime.toISOString(),
          urgency: interval.urgency
        });
      }
    }

    // Guardar tracking de recordatorios programados
    try {
      const trackingKey = `${NOTIFICATION_TRACKING_KEY}_${task.id}`;
      await AsyncStorage.setItem(trackingKey, JSON.stringify({
        taskId: task.id,
        scheduled,
        createdAt: new Date().toISOString()
      }));
    } catch (e) {
      // Ignore storage errors
    }

    return { scheduled, escalationLevel: scheduled.length };
  } catch (e) {
    return { scheduled: [], escalationLevel: 0 };
  }
}

// Cancelar todos los recordatorios escalonados de una tarea
export async function cancelEscalatedReminders(taskId) {
  try {
    const trackingKey = `${NOTIFICATION_TRACKING_KEY}_${taskId}`;
    const stored = await AsyncStorage.getItem(trackingKey);
    
    if (stored) {
      const data = JSON.parse(stored);
      for (const reminder of data.scheduled || []) {
        if (reminder.id) {
          await Notifications.cancelScheduledNotificationAsync(reminder.id);
        }
      }
      await AsyncStorage.removeItem(trackingKey);
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

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
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const assignedUsers = [];
    
    usersSnap.forEach(doc => {
      const userData = doc.data();
      if (assignees.map(e => e.toLowerCase()).includes(userData.email?.toLowerCase())) {
        assignedUsers.push({ id: doc.id, ...userData });
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

// Cancelar múltiples notificaciones
export async function cancelNotifications(notificationIds = []) {
  // En web no hay notificaciones que cancelar
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    if (!notificationIds || notificationIds.length === 0) {
      return;
    }
    await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (e) {
    if (__DEV__) console.error('Error cancelando notificaciones:', e);
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
 * 1️⃣ NOTIFICACIONES RECURRENTES CADA HORA PARA TAREAS URGENTES
 * Programa notificaciones cada hora para tareas con prioridad alta o vencidas
 */
export async function scheduleHourlyReminders(task) {
  if (Platform.OS === 'web' || !task) {
    return [];
  }

  try {
    const granted = await ensurePermissions();
    if (!granted) return [];

    // Solo para tareas de alta prioridad o vencidas
    const isUrgent = task.priority === 'alta';
    const isOverdue = task.dueAt && toMs(task.dueAt) < Date.now();
    
    if (!isUrgent && !isOverdue) {
      return [];
    }

    const ids = [];
    const now = new Date();
    
    // Programar 12 notificaciones (cada hora durante 12 horas)
    for (let i = 1; i <= 12; i++) {
      const triggerTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 URGENTE: ${task.title}`,
          body: isOverdue 
            ? `⏰ Esta tarea está VENCIDA. Complétala ahora.`
            : `⚡ Tarea de alta prioridad pendiente. Vence: ${new Date(toMs(task.dueAt)).toLocaleDateString()}`,
          data: { 
            taskId: task.id,
            type: 'hourly_urgent',
            priority: task.priority,
            hour: i,
            sticky: true // Marcar como persistente
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: '#DC2626',
          vibrate: [0, 500, 200, 500], // Vibración más fuerte
          badge: 1,
          sticky: true, // Android: notificación persistente
          ongoing: true, // Android: no se puede descartar fácilmente
        },
        trigger: triggerTime
      });

      ids.push(id);
    }

    return ids;
  } catch (e) {
    if (__DEV__) console.error('Error programando notificaciones horarias:', e);
    return [];
  }
}

/**
 * NOTIFICACIONES PERSISTENTES CON ACCIONES OBLIGATORIAS
 * Crea notificaciones que requieren acción del usuario para descartarse
 */
export async function schedulePersistentNotification(task) {
  if (Platform.OS === 'web' || !task) {
    return null;
  }

  try {
    const granted = await ensurePermissions();
    if (!granted) return null;

    // Definir categoría con acciones
    await Notifications.setNotificationCategoryAsync('TASK_ACTION', [
      {
        identifier: 'COMPLETE',
        buttonTitle: 'Completar',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'SNOOZE',
        buttonTitle: 'Posponer 1h',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'VIEW',
        buttonTitle: 'Ver Tarea',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `REQUIERE ACCIÓN: ${task.title}`,
        body: `Esta tarea necesita tu atención inmediata. Vence: ${new Date(toMs(task.dueAt)).toLocaleDateString()}`,
        data: { 
          taskId: task.id,
          type: 'persistent_action_required',
          requiresConfirmation: true,
          timestamp: Date.now()
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#DC2626',
        vibrate: [0, 500, 200, 500, 200, 500],
        badge: 1,
        sticky: true, // No se puede descartar fácilmente
        ongoing: true, // Android: notificación persistente
        categoryIdentifier: 'TASK_ACTION', // Asociar acciones
        autoDismiss: false, // No descartar automáticamente
      },
      trigger: null // Inmediata
    });

    // Guardar tracking de notificación enviada
    await trackNotificationSent(task.id, id);

    return id;
  } catch (e) {
    if (__DEV__) console.error('Error creando notificación persistente:', e);
    return null;
  }
}

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

// Verificar notificaciones no confirmadas y reprogramar
export async function checkUnconfirmedNotifications(tasks) {
  if (Platform.OS === 'web') return;
  
  try {
    const tracking = await AsyncStorage.getItem(NOTIFICATION_TRACKING_KEY);
    if (!tracking) return;
    
    const data = JSON.parse(tracking);
    const now = Date.now();
    const CONFIRMATION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    
    for (const taskId in data) {
      const notifData = data[taskId];
      
      // Si no se confirmó y pasaron más de 30 minutos, reprogramar
      if (!notifData.confirmed && (now - notifData.sentAt) > CONFIRMATION_TIMEOUT) {
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.status !== 'cerrada') {
          
          // Enviar notificación más agresiva
          await schedulePersistentNotification(task);
          
          // Incrementar nivel de escalado
          await incrementEscalationLevel(taskId);
        }
      }
    }
  } catch (e) {
    if (__DEV__) console.error('Error verificando notificaciones no confirmadas:', e);
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

// Resetear nivel de escalado cuando se completa tarea
export async function resetEscalationLevel(taskId) {
  try {
    await AsyncStorage.removeItem(`${ESCALATION_LEVEL_KEY}_${taskId}`);
  } catch (e) {
    if (__DEV__) console.error('Error reseteando escalado:', e);
  }
}

// Programar notificaciones con escalado progresivo
export async function scheduleEscalatedNotifications(task) {
  if (Platform.OS === 'web' || !task) return [];
  
  try {
    const granted = await ensurePermissions();
    if (!granted) return [];
    
    const level = await getEscalationLevel(task.id);
    const ids = [];
    
    // Configuración según nivel de escalado
    const escalationConfig = {
      0: { intervals: [60], priority: 'DEFAULT', vibration: [0, 250, 250, 250] },
      1: { intervals: [30, 60], priority: 'HIGH', vibration: [0, 300, 200, 300] },
      2: { intervals: [15, 30, 45, 60], priority: 'HIGH', vibration: [0, 400, 200, 400] },
      3: { intervals: [10, 20, 30, 40, 50, 60], priority: 'MAX', vibration: [0, 500, 200, 500, 200, 500] },
      4: { intervals: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], priority: 'MAX', vibration: [0, 600, 200, 600, 200, 600] },
      5: { intervals: Array.from({length: 20}, (_, i) => (i + 1) * 3), priority: 'MAX', vibration: [0, 800, 200, 800, 200, 800, 200, 800] }, // Cada 3 minutos
    };
    
    const config = escalationConfig[level] || escalationConfig[0];
    const now = new Date();
    
    for (const minutes of config.intervals) {
      const triggerTime = new Date(now.getTime() + minutes * 60 * 1000);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `NIVEL ${level}: ${task.title}`,
          body: level >= 3 
            ? `CRÍTICO: Esta tarea lleva mucho tiempo sin atención. RESPONDE AHORA.`
            : `Recordatorio ${level > 0 ? 'escalado' : ''}: Completa esta tarea.`,
          data: { 
            taskId: task.id,
            type: 'escalated',
            escalationLevel: level,
            minute: minutes
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority[config.priority],
          color: level >= 3 ? '#7F1D1D' : '#DC2626',
          vibrate: config.vibration,
          badge: level + 1,
          sticky: level >= 2, // Nivel 2+ son persistentes
          ongoing: level >= 3, // Nivel 3+ no se pueden descartar
        },
        trigger: triggerTime
      });
      
      ids.push(id);
    }
    
    return ids;
  } catch (e) {
    if (__DEV__) console.error('Error programando notificaciones escaladas:', e);
    return [];
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

