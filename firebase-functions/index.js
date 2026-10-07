// Cloud Functions de la app.
// Deploy: firebase deploy --only functions   (requiere el plan Blaze)
//
//   adminSetUserPassword   el administrador cambia la contraseña de otra cuenta
//   onUserDeleted          al borrar un usuario se borra su cuenta de Firebase Auth
//   onNotificationCreated  cada aviso de la app (colección `notifications`) sale también
//                          como notificación push a los dispositivos del usuario
//   onReportRated          avisa al autor cuando califican su reporte
//   notifyDueTasksReminder avisa a los asignados de las tareas que vencen pronto
//   onAreaSubtaskChanged   recalcula el avance de una tarea repartida entre varias áreas
//   cleanupExpiredTokens   borra los tokens de push vencidos
//
// Los tokens que registra la app (services/pushNotifications.js) son tokens de Expo:
// se envían por el servicio de push de Expo, no directo a FCM.

import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo admite hasta 100 mensajes por petición
const EXPO_CHUNK_SIZE = 100;
const DUE_SOON_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;
// Estados en los que la tarea sigue en manos de los asignados
const OPEN_STATUSES = new Set(['pendiente', 'en_proceso', 'en_progreso']);
// 'cerrada' y las variantes antiguas que la app trata como cerrada (utils/taskStatus.js)
const CLOSED_STATUSES = new Set(['cerrada', 'cerrado', 'completada', 'completado']);
// Un área terminó su parte cuando su subtarea está en revisión o finalizada
const DONE_STATUSES = new Set(['en_revision', 'revision', ...CLOSED_STATUSES]);

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();
const isExpoToken = (token) => typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);
const toMillis = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : null);

const assignedEmailsOf = (task) => {
  const raw = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
  return [...new Set(raw.map(normalizeEmail).filter(Boolean))];
};

/** Usuarios activos por correo: Map(correo → { id, ...datos }) */
const loadActiveUsersByEmail = async () => {
  const snapshot = await db.collection('users').get();
  const users = new Map();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const email = normalizeEmail(data.email);
    if (email && data.active !== false) users.set(email, { id: doc.id, ...data });
  });
  return users;
};

/**
 * Enviar una notificación push a todos los dispositivos de un usuario.
 * Los tokens que Expo reporta como dados de baja se borran.
 * @returns {Promise<{ sent: number, failed: number }>}
 */
const sendPushToUser = async (userId, { title, body, data }) => {
  const snapshot = await db.collection('user_push_tokens').where('userId', '==', userId).get();
  const now = Date.now();
  const tokenDocs = snapshot.docs.filter((doc) => {
    const { token, expiresAt } = doc.data();
    const expires = toMillis(expiresAt);
    return isExpoToken(token) && (!expires || expires > now);
  });
  if (tokenDocs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tokenDocs.length; i += EXPO_CHUNK_SIZE) {
    const chunk = tokenDocs.slice(i, i + EXPO_CHUNK_SIZE);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map((doc) => ({
        to: doc.data().token,
        title,
        body,
        data,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }))),
    });
    if (!response.ok) {
      failed += chunk.length;
      console.error('Expo push respondió', response.status);
      continue;
    }

    const tickets = (await response.json()).data || [];
    const deletions = [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent++;
        return;
      }
      failed++;
      if (ticket.details?.error === 'DeviceNotRegistered') deletions.push(chunk[index].ref.delete());
    });
    await Promise.all(deletions);
  }
  return { sent, failed };
};

/**
 * Cada aviso que la app guarda en `notifications` sale también como push.
 * La app escribe esos avisos al asignar una tarea, al llegar un mensaje al chat
 * y al enviarse un reporte.
 */
export const onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    if (!notification.userId || notification.deleted) return null;

    try {
      const result = await sendPushToUser(notification.userId, {
        title: notification.title || 'Nueva notificación',
        body: notification.body || notification.message || '',
        data: {
          notificationId: context.params.notificationId,
          type: notification.type || '',
          taskId: notification.taskId || '',
        },
      });
      console.log(`Push de ${context.params.notificationId}: ${result.sent} enviados, ${result.failed} fallidos`);
    } catch (error) {
      console.error('Error in onNotificationCreated:', error);
    }
    return null;
  });

/**
 * Avisar al autor de un reporte cuando lo califican
 */
export const onReportRated = functions.firestore
  .document('task_reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Solo cuando la calificación es nueva
    if (before.rating || !after.rating) return null;

    try {
      // createdBy guarda el correo del autor (o su id en reportes antiguos)
      const author = normalizeEmail(after.createdBy);
      const users = await loadActiveUsersByEmail();
      const user = users.get(author) || [...users.values()].find((u) => u.id === after.createdBy);
      if (!user) return null;

      await db.collection('notifications').add({
        userId: user.id,
        userEmail: normalizeEmail(user.email),
        type: 'report_rated',
        title: '⭐ Calificaron tu reporte',
        body: `"${after.title || 'Reporte'}": ${after.rating} de 5`,
        taskId: after.taskId || '',
        reportId: context.params.reportId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error in onReportRated:', error);
    }
    return null;
  });

/**
 * Avisar a los asignados de las tareas abiertas que vencen en las próximas horas.
 * Cada tarea se avisa una sola vez por fecha límite: si la fecha cambia, se vuelve a avisar.
 */
export const notifyDueTasksReminder = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    const now = Date.now();
    const snapshot = await db
      .collection('tasks')
      .where('dueAt', '>', new Date(now))
      .where('dueAt', '<=', new Date(now + DUE_SOON_HOURS * HOUR_MS))
      .get();

    const pending = snapshot.docs.filter((doc) => {
      const task = doc.data();
      return !task.deleted
        && OPEN_STATUSES.has(task.status || 'pendiente')
        && task.dueReminderSentFor !== toMillis(task.dueAt);
    });
    if (pending.length === 0) return null;

    const users = await loadActiveUsersByEmail();
    let notified = 0;

    for (const doc of pending) {
      const task = doc.data();
      const dueAtMs = toMillis(task.dueAt);
      const hours = Math.max(1, Math.ceil((dueAtMs - now) / HOUR_MS));
      const batch = db.batch();

      assignedEmailsOf(task).forEach((email) => {
        const user = users.get(email);
        if (!user) return;
        batch.set(db.collection('notifications').doc(), {
          userId: user.id,
          userEmail: email,
          type: 'task_due_soon',
          title: '⏰ Tarea por vencer',
          body: `"${task.title || 'Tarea'}" vence en ${hours === 1 ? 'menos de 1 hora' : `menos de ${hours} horas`}`,
          taskId: doc.id,
          taskTitle: task.title || '',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        notified++;
      });
      batch.update(doc.ref, { dueReminderSentFor: dueAtMs });
      await batch.commit();
    }

    console.log(`Recordatorios de vencimiento: ${notified} avisos en ${pending.length} tareas`);
    return null;
  });

/**
 * Avance de una tarea repartida entre varias áreas.
 * Cuando cambia la subtarea de un área, se recalcula el avance de la tarea principal.
 *
 * La app también lo intenta (services/areaSubtasks.js → updateParentTaskProgress), pero
 * con las reglas seguras un director no puede leer las subtareas de las otras áreas:
 * aquí se hace con permisos de servidor, sin depender de quién hizo el cambio.
 */
export const onAreaSubtaskChanged = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    const subtask = after || before;
    if (!subtask?.isAreaSubtask || !subtask.parentTaskId) return null;
    // Solo importa si cambió el estado o si entró o salió de la papelera
    if (before && after && before.status === after.status && !!before.deleted === !!after.deleted) {
      return null;
    }

    try {
      const parentRef = db.collection('tasks').doc(subtask.parentTaskId);
      const [siblings, parentSnap] = await Promise.all([
        db.collection('tasks')
          .where('parentTaskId', '==', subtask.parentTaskId)
          .where('isAreaSubtask', '==', true)
          .get(),
        parentRef.get(),
      ]);
      if (!parentSnap.exists) return null;

      const active = siblings.docs.map((doc) => doc.data()).filter((task) => !task.deleted);
      if (active.length === 0) return null;

      // Un área terminó cuando su subtarea está en revisión o finalizada
      const done = active.filter((task) => DONE_STATUSES.has(task.status)).length;
      const update = {
        subtasksCompleted: done,
        coordinationProgress: Math.round((done / active.length) * 100),
        updatedAt: FieldValue.serverTimestamp(),
      };
      // Todas las áreas terminaron: la principal pasa a revisión del administrador
      // (sin tocarla si ya la finalizó)
      const parentStatus = parentSnap.data().status;
      if (done === active.length && !CLOSED_STATUSES.has(parentStatus) && parentStatus !== 'en_revision') {
        update.status = 'en_revision';
        update.allAreasCompletedAt = FieldValue.serverTimestamp();
      }
      await parentRef.update(update);
    } catch (error) {
      console.error('Error in onAreaSubtaskChanged:', error);
    }
    return null;
  });

/**
 * Borrar los tokens de push vencidos. La app renueva el suyo cada vez que se abre.
 */
export const cleanupExpiredTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const snapshot = await db
      .collection('user_push_tokens')
      .where('expiresAt', '<', new Date())
      .limit(400)
      .get();
    if (snapshot.empty) return null;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Tokens vencidos borrados: ${snapshot.size}`);
    return null;
  });

/**
 * Cambiar la contraseña de otro usuario. Solo administradores.
 * Se llama desde la app con httpsCallable('adminSetUserPassword').
 */
export const adminSetUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Inicia sesión');
  }

  const callerSnap = await db.collection('users').doc(context.auth.uid).get();
  const caller = callerSnap.data();
  if (!callerSnap.exists || caller.role !== 'admin' || caller.active === false) {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores');
  }

  const { userId, newPassword } = data || {};
  if (!userId || typeof userId !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'userId y contraseña (mínimo 6 caracteres) requeridos');
  }

  await admin.auth().updateUser(userId, { password: newPassword });
  return { success: true };
});

/**
 * Al borrar el documento de un usuario, borrar también su cuenta de Firebase Auth
 * y sus tokens de push
 */
export const onUserDeleted = functions.firestore
  .document('users/{userId}')
  .onDelete(async (_snap, context) => {
    const { userId } = context.params;
    try {
      await admin.auth().deleteUser(userId);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        console.error('Error in onUserDeleted:', error);
      }
    }
    try {
      const tokens = await db.collection('user_push_tokens').where('userId', '==', userId).get();
      await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
    } catch (error) {
      console.error('Error borrando tokens del usuario eliminado:', error);
    }
    return null;
  });
