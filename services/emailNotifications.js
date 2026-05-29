// services/emailNotifications.js
// Servicio para enviar notificaciones por email
// Requiere configurar SendGrid API Key en variables de entorno

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const APP_URL = process.env.APP_URL || process.env.EXPO_PUBLIC_APP_URL || '';
import { toMs } from '../utils/dateUtils';
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.EXPO_PUBLIC_FROM_EMAIL || 'noreply@todoapp.com';

/**
 * Enviar email usando SendGrid API
 * @param {Object} params - {to, subject, html}
 */
async function sendEmail({ to, subject, html }) {
  if (!SENDGRID_API_KEY) {
    if (__DEV__) console.warn('sendEmail: SENDGRID_API_KEY no configurada, email no enviado');
    return { success: false, error: 'SENDGRID_API_KEY no configurada' };
  }
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject
        }],
        from: { email: FROM_EMAIL },
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Template base para emails
 */
function getEmailTemplate(title, content, actionUrl, actionText) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #9F2241 0%, #751a32 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 20px; }
    .content h2 { color: #9F2241; margin-top: 0; font-size: 20px; }
    .button { display: inline-block; background: #9F2241; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #751a32; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
      ${actionUrl ? `<center><a href="${actionUrl}" class="button">${actionText || 'Ver Tarea'}</a></center>` : ''}
    </div>
    <div class="footer">
      <p>Este es un mensaje automático de tu sistema de tareas.</p>
      <p>© ${new Date().getFullYear()} TodoApp. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Enviar email cuando se asigna una tarea
 * Soporta tanto string como array de emails
 */
export async function notifyTaskAssigned(task, assignedTo) {
  // Asegurar que assignedTo es un array
  const emails = Array.isArray(assignedTo) 
    ? assignedTo 
    : (assignedTo ? [assignedTo] : []);
  
  if (emails.length === 0) {
    return { success: false, error: 'No hay destinatarios' };
  }

  const results = [];
  
  // Enviar a cada persona asignada individualmente
  for (const email of emails) {
    if (!email || typeof email !== 'string') continue;
    
    const content = `
      <h2>Nueva tarea asignada</h2>
      <p>Se te ha asignado una nueva tarea:</p>
      <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong style="font-size: 16px; color: #9F2241;">${task.title}</strong>
        <p style="margin: 10px 0;">${task.description || 'Sin descripción'}</p>
        <p style="margin: 5px 0;"><strong>Área:</strong> ${task.area || 'Sin especificar'}</p>
        <p style="margin: 5px 0;"><strong>Prioridad:</strong> <span style="color: ${task.priority === 'alta' ? '#EF4444' : task.priority === 'media' ? '#F59E0B' : '#10B981'}; font-weight: 600;">${(task.priority || 'normal').toUpperCase()}</span></p>
        <p style="margin: 5px 0;"><strong>Vence:</strong> ${task.dueAt ? new Date(toMs(task.dueAt)).toLocaleString('es-ES') : 'Sin fecha'}</p>
      </div>
    `;
    
    const html = getEmailTemplate(
      'Nueva Tarea Asignada',
      content,
      APP_URL ? `${APP_URL}/tasks/${task.id}` : null,
      'Ver Tarea'
    );
    
    const result = await sendEmail({
      to: email,
      subject: `Nueva tarea: ${task.title}`,
      html
    });
    
    results.push({ email, ...result });
  }
  
  // Retornar éxito si al menos una notificación se envió
  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    results,
    message: `${successCount}/${emails.length} notificaciones enviadas`
  };
}

/**
 * Enviar email cuando una tarea está por vencer (24h)
 */
export async function notifyTaskDueSoon(task, assignedTo) {
  const dueAtMs = toMs(task.dueAt);
  const hoursRemaining = Math.floor((dueAtMs - Date.now()) / (1000 * 60 * 60));
  
  const content = `
    <h2>⏰ Tarea próxima a vencer</h2>
    <p>La siguiente tarea vence en <strong>${hoursRemaining} horas</strong>:</p>
    <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B;">
      <strong style="font-size: 16px; color: #F59E0B;">${task.title}</strong>
      <p style="margin: 10px 0;">${task.description}</p>
      <p style="margin: 5px 0;"><strong>Vence:</strong> ${new Date(dueAtMs).toLocaleString('es-ES')}</p>
      <p style="margin: 5px 0;"><strong>Estado:</strong> ${task.status === 'pendiente' ? 'Pendiente' : (task.status === 'en_proceso' || task.status === 'en-progreso') ? 'En proceso' : 'En revisión'}</p>
    </div>
    <p>¡No olvides completarla a tiempo!</p>
  `;
  
  const html = getEmailTemplate(
    'Tarea Próxima a Vencer',
    content,
    APP_URL ? `${APP_URL}/tasks/${task.id}` : null,
    'Abrir Tarea'
  );
  
  return await sendEmail({
    to: assignedTo,
    subject: `⏰ La tarea "${task.title}" vence pronto`,
    html
  });
}

/**
 * Enviar email cuando hay un nuevo mensaje en el chat
 */
export async function notifyNewChatMessage(task, message, recipient) {
  const content = `
    <h2>💬 Nuevo mensaje en el chat</h2>
    <p><strong>${message.author}</strong> escribió en la tarea:</p>
    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong style="font-size: 16px; color: #9F2241;">${task.title}</strong>
    </div>
    <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196F3;">
      <p style="margin: 0; font-style: italic;">"${message.text}"</p>
    </div>
  `;
  
  const html = getEmailTemplate(
    'Nuevo Mensaje',
    content,
    APP_URL ? `${APP_URL}/tasks/${task.id}/chat` : null,
    'Ver Chat'
  );
  
  return await sendEmail({
    to: recipient,
    subject: `💬 Nuevo mensaje en "${task.title}"`,
    html
  });
}

/**
 * Enviar resumen diario de tareas
 */
export async function sendDailySummary(userEmail, summary) {
  const { overdue, dueToday, dueSoon, total } = summary;
  
  let statusHtml = '';
  if (overdue > 0) {
    statusHtml += `<div style="background: #FEE; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #EF4444;">
      <strong style="color: #EF4444;">${overdue} tarea${overdue > 1 ? 's' : ''} vencida${overdue > 1 ? 's' : ''}</strong>
    </div>`;
  }
  if (dueToday > 0) {
    statusHtml += `<div style="background: #FFF3E0; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #F59E0B;">
      <strong style="color: #F59E0B;">📅 ${dueToday} tarea${dueToday > 1 ? 's' : ''} vence${dueToday > 1 ? 'n' : ''} hoy</strong>
    </div>`;
  }
  if (dueSoon > 0) {
    statusHtml += `<div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #2196F3;">
      <strong style="color: #2196F3;">⏰ ${dueSoon} tarea${dueSoon > 1 ? 's' : ''} próxima${dueSoon > 1 ? 's' : ''} a vencer</strong>
    </div>`;
  }
  
  if (!statusHtml) {
    statusHtml = `<div style="background: #E8F5E9; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #4CAF50;">
      <strong style="color: #4CAF50;">✅ ¡Excelente! Todas tus tareas están al día</strong>
    </div>`;
  }
  
  const content = `
    <h2>Buenos días! 🌅</h2>
    <p>Aquí está el resumen de tus tareas:</p>
    ${statusHtml}
    <p style="margin-top: 20px;">Tienes <strong>${total} tareas activas</strong> en total.</p>
  `;
  
  const html = getEmailTemplate(
    'Resumen Diario de Tareas',
    content,
    APP_URL || null,
    'Abrir App'
  );
  
  return await sendEmail({
    to: userEmail,
    subject: `Resumen del día - ${new Date().toLocaleDateString('es-ES')}`,
    html
  });
}
