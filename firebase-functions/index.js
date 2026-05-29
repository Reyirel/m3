// Firebase Cloud Function para procesar push notifications
// Archivo: functions/src/index.ts o index.js
// Deploy: firebase deploy --only functions

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Procesar cola de notificaciones pendientes
 * Ejecutar cada 5 minutos via Cloud Scheduler
 */
export const processPushNotificationQueue = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (_context) => {
    try {
      const now = new Date();

      // Obtener notificaciones pendientes
      const pendingSnapshot = await db
        .collection('push_notifications_queue')
        .where('status', '==', 'pending')
        .where('expiresAt', '>', now)
        .limit(100)
        .get();

      let sent = 0;
      let failed = 0;

      for (const doc of pendingSnapshot.docs) {
        try {
          const notification = doc.data();
          const { userId, title, body, data } = notification;

          // Obtener tokens de push del usuario
          const tokensSnapshot = await db
            .collection('user_push_tokens')
            .where('userId', '==', userId)
            .where('expiresAt', '>', now)
            .get();

          const tokens = tokensSnapshot.docs.map((t) => t.data().token);

          if (tokens.length === 0) {
            // No hay tokens válidos, marcar como completado
            await doc.ref.update({
              status: 'no_tokens',
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            continue;
          }

          // Enviar a todos los tokens del usuario
          const messagePayload = {
            notification: {
              title,
              body,
            },
            data: data || {},
            android: {
              priority: 'high',
              ttl: 3600,
            },
            apns: {
              headers: {
                'apns-priority': '10',
              },
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                  sound: 'default',
                  'mutable-content': 1,
                },
              },
            },
            webpush: {
              headers: {
                TTL: '3600',
              },
            },
          };

          // Multicast send
          const response = await messaging.sendMulticast({
            ...messagePayload,
            tokens,
          });

          // Log de respuesta
          const successCount = response.successCount;
          const failureCount = response.failureCount;

          // Actualizar tokens inválidos
          for (let i = 0; i < response.responses.length; i++) {
            const resp = response.responses[i];
            if (!resp.success) {
              const token = tokens[i];
              const error = resp.error;

              // Si token es inválido, eliminar
              if (error?.code === 'messaging/invalid-registration-token' ||
                  error?.code === 'messaging/registration-token-not-registered') {
                await db
                  .collection('user_push_tokens')
                  .where('token', '==', token)
                  .get()
                  .then((snap) => {
                    snap.forEach((d) => d.ref.delete());
                  });
              }
            }
          }

          // Marcar como enviado
          await doc.ref.update({
            status: 'sent',
            sentCount: successCount,
            failedCount: failureCount,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          sent++;
        } catch (error) {
          console.error('Error processing notification:', error);
          failed++;

          // Marcar como error
          await doc.ref.update({
            status: 'error',
            error: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      console.log(`Processed ${sent} notifications, ${failed} failed`);
      return { processed: sent, failed };
    } catch (error) {
      console.error('Error in processPushNotificationQueue:', error);
      return error;
    }
  });

/**
 * Procesar notificaciones agendadas
 * Ejecutar cada minuto
 */
export const processScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (_context) => {
    try {
      const now = new Date();

      // Obtener notificaciones que deben ser enviadas
      const scheduledSnapshot = await db
        .collection('scheduled_notifications')
        .where('status', '==', 'pending')
        .where('scheduleAt', '<=', now)
        .limit(50)
        .get();

      let processed = 0;

      for (const doc of scheduledSnapshot.docs) {
        try {
          const notification = doc.data();

          // Mover a cola de notificaciones
          await db.collection('push_notifications_queue').add({
            userId: notification.userId,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            scheduledFrom: doc.id,
          });

          // Marcar como enviado
          await doc.ref.update({
            status: 'sent',
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          processed++;
        } catch (error) {
          console.error('Error processing scheduled notification:', error);
          await doc.ref.update({
            status: 'error',
            error: error.message,
          });
        }
      }

      console.log(`Processed ${processed} scheduled notifications`);
      return { processed };
    } catch (error) {
      console.error('Error in processScheduledNotifications:', error);
      return error;
    }
  });

/**
 * Limpiar tokens expirados
 * Ejecutar cada hora
 */
export const cleanupExpiredTokens = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (_context) => {
    try {
      const now = new Date();

      const snapshot = await db
        .collection('user_push_tokens')
        .where('expiresAt', '<', now)
        .get();

      let deleted = 0;
      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleted++;
      });

      await batch.commit();
      console.log(`Cleaned up ${deleted} expired tokens`);
      return { deleted };
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return error;
    }
  });

/**
 * Enviar notificación cuando se crea una tarea
 */
export const onTaskCreated = functions.firestore
  .document('Tasks/{taskId}')
  .onCreate(async (snap, context) => {
    try {
      const task = snap.data();
      const { taskId } = context.params;

      // Si la tarea tiene asignados, notificarlos
      if (task.assignedToNames && task.assignedToNames.length > 0) {
        // Obtener IDs de usuarios asignados
        const usersSnapshot = await db
          .collection('users')
          .where('displayName', 'in', task.assignedToNames)
          .get();

        const userIds = usersSnapshot.docs.map((d) => d.id);

        // Crear notificaciones
        const batch = db.batch();
        userIds.forEach((userId) => {
          batch.set(db.collection('push_notifications_queue').doc(), {
            userId,
            title: '📋 Nueva Tarea Asignada',
            body: task.titulo || 'Nueva tarea',
            data: {
              type: 'task_assigned',
              taskId,
              createdBy: task.createdBy,
            },
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
        });

        await batch.commit();
        console.log(`Task notification sent to ${userIds.length} users`);
      }

      return null;
    } catch (error) {
      console.error('Error in onTaskCreated:', error);
      return error;
    }
  });

/**
 * Enviar notificación cuando se califica un reporte
 */
export const onReportRated = functions.firestore
  .document('task_reports/{reportId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Si el rating es nuevo (antes no tenía)
      if (!before.rating && after.rating) {
        const { reportId } = context.params;

        // Crear notificación para quien envió el reporte
        await db.collection('push_notifications_queue').add({
          userId: after.createdBy,
          title: '⭐ Tu Reporte fue Calificado',
          body: `Calificación: ${after.rating}/5 estrellas`,
          data: {
            type: 'report_rated',
            reportId,
            taskId: after.taskId,
            rating: after.rating,
          },
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        console.log(`Report rating notification sent for report: ${reportId}`);
      }

      return null;
    } catch (error) {
      console.error('Error in onReportRated:', error);
      return error;
    }
  });

/**
 * Enviar recordatorio de tareas vencidas
 * Ejecutar cada 30 minutos
 */
export const notifyDueTasksReminder = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (_context) => {
    try {
      const now = Date.now();
      const _in6Hours = new Date(now + 6 * 60 * 60 * 1000);
      const in24Hours = new Date(now + 24 * 60 * 60 * 1000);

      // Obtener tareas que vencen en las próximas 6-24 horas
      const tasksSnapshot = await db
        .collection('Tasks')
        .where('status', 'in', ['pendiente', 'en_progreso'])
        .where('dueAt', '>', new Date(now))
        .where('dueAt', '<', in24Hours)
        .get();

      let notificationsSent = 0;
      const batch = db.batch();

      for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        const dueAtMs = task.dueAt?.toMillis ? task.dueAt.toMillis() : (task.dueAt?.seconds ? task.dueAt.seconds * 1000 : task.dueAt);
        const hoursUntilDue = Math.floor(
          (dueAtMs - now) / (60 * 60 * 1000)
        );

        // Solo notificar si es menor a 6 horas
        if (hoursUntilDue <= 6) {
          // Notificar a responsables
          const assignees = task.assignedToNames || [];
          const usersSnapshot = await db
            .collection('users')
            .where('displayName', 'in', assignees)
            .get();

          usersSnapshot.docs.forEach((userDoc) => {
            batch.set(db.collection('push_notifications_queue').doc(), {
              userId: userDoc.id,
              title: '⏰ Tarea Vence Pronto',
              body: `${task.titulo} (en ${hoursUntilDue} horas)`,
              data: {
                type: 'task_due_soon',
                taskId: doc.id,
                hoursUntilDue,
              },
              status: 'pending',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            notificationsSent++;
          });
        }
      }

      if (notificationsSent > 0) {
        await batch.commit();
      }

      console.log(`Sent ${notificationsSent} due date reminders`);
      return { sent: notificationsSent };
    } catch (error) {
      console.error('Error in notifyDueTasksReminder:', error);
      return error;
    }
  });

/**
 * HTTP endpoint para testing (opcional)
 */
export const testPushNotification = functions.https.onRequest(
  async (req, res) => {
    try {
      const { userId, title, body } = req.body;

      if (!userId || !title || !body) {
        res.status(400).send('Missing required fields');
        return;
      }

      // Crear notificación en cola
      await db.collection('push_notifications_queue').add({
        userId,
        title,
        body,
        data: { type: 'test' },
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      res.status(200).send('Notification queued for sending');
    } catch (error) {
      console.error('Error in testPushNotification:', error);
      res.status(500).send(error.message);
    }
  }
);
