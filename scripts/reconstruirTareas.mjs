// reconstruirTareas.mjs
// Vuelve a crear las tareas que desaparecieron de Firestore, a partir de lo que quedó:
// los avisos de asignación (título, asignados, prioridad, fecha límite), los avisos y
// documentos de reportes (título, área) y el chat y las subtareas, que siguen guardados
// bajo el identificador de cada tarea.
//
// - Cada tarea se crea con su MISMO identificador: recupera sola su chat, sus subtareas
//   y sus reportes.
// - Nunca sobrescribe: si la tarea ya existe, se salta.
// - No recrea las copias repetidas de una misma tarea (las generaba un error al editar)
//   ni las tareas de prueba.
// - Lo que no se puede saber queda marcado: sin descripción original y en "pendiente".
//
// Uso:
//   node scripts/reconstruirTareas.mjs            → muestra el plan, no escribe
//   node scripts/reconstruirTareas.mjs --apply    → crea las tareas
//   --respaldo=data/respaldo-AAAA-MM-DD...        (por omisión, el más reciente con avisos)

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getSecretariasForAreas, resolveAreaName } from '../config/areas.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const option = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'infra-sublime-464215-m5.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'infra-sublime-464215-m5',
};
const db = getFirestore(initializeApp(firebaseConfig));

// A qué cuenta actual pasan las tareas de una cuenta que ya no se usa
const ACCOUNT_ALIASES = {
  // La misma persona, que ahora entra con la cuenta de su área
  'marco.aldana@municipio.com': 'comunicacion@municipio.com',
  // Dejó de ser Secretario Técnico del Despacho: sus tareas pasan a quien ocupa el puesto
  'marco.cabanas@municipio.com': 'jose.zuniga@municipio.com',
};

// Títulos que claramente son pruebas del sistema: "prueba…", "hola", o teclas repetidas
// ("gggggggggggg", "dkdkdkdkkd", "ahahhahahahahahah")
const isTestTitle = (title) => {
  const text = String(title || '').trim();
  if (/^(prueba|test)\b/i.test(text) || /^hola$/i.test(text)) return true;
  const letters = text.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
  return letters.length >= 6 && new Set(letters).size / letters.length <= 0.4 && !/\s/.test(text);
};
const BATCH_WINDOW_MS = 2 * 60 * 1000;
const DESCRIPTION = 'Tarea reconstruida el 7 de octubre de 2026 a partir de los avisos y reportes guardados. '
  + 'La descripción original se perdió: complétala.';

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();
const plain = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toMs = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value.__fecha) return new Date(value.__fecha).getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};
const day = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '?');

const findBackup = () => {
  const chosen = option('respaldo');
  if (chosen) return chosen;
  const dirs = readdirSync('data').filter((name) => name.startsWith('respaldo-') && existsSync(join('data', name, 'notifications.json'))).sort();
  if (!dirs.length) throw new Error('No hay un respaldo con avisos en data/. Ejecuta antes scripts/respaldarYRastrearTareas.mjs');
  return join('data', dirs[dirs.length - 1]);
};

async function main() {
  const backupDir = findBackup();
  const load = (name) => JSON.parse(readFileSync(join(backupDir, `${name}.json`), 'utf8'));
  const notifications = load('notifications');
  const reports = load('task_reports').filter((r) => !r.deleted);

  console.log('='.repeat(72));
  console.log('RECONSTRUIR TAREAS');
  console.log(`Proyecto: ${firebaseConfig.projectId}   Respaldo: ${backupDir}`);
  console.log(`Modo: ${APPLY ? 'CREAR LAS TAREAS' : 'SOLO MOSTRAR EL PLAN (no escribe)'}`);
  console.log('='.repeat(72));

  // Usuarios como están AHORA (cuentas activas, a quién reemplazó quién, área de cada uno)
  const users = (await getDocs(collection(db, 'users'))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const userByEmail = new Map(users.map((u) => [normalizeEmail(u.email), u]));
  const userByName = new Map(users.filter((u) => u.active !== false).map((u) => [plain(u.displayName).replace(/^(C|LIC|MTRO|MTRA|ING|LD|TSU|LC|LAP) /, ''), u]));

  // Cuenta activa que hoy corresponde a un correo asignado en su momento (o null)
  const currentAccount = (email) => {
    let current = normalizeEmail(ACCOUNT_ALIASES[email] || email);
    for (let hops = 0; hops < 5; hops++) {
      const user = userByEmail.get(current);
      if (!user) return null;
      if (user.active !== false) return user;
      if (!user.replacedBy) return null;
      current = normalizeEmail(user.replacedBy);
    }
    return null;
  };
  const unitOf = (user) => (user.role === 'secretario'
    ? resolveAreaName(user.area)
    : resolveAreaName((user.areasPermitidas || [])[0] || user.area));

  // ── Lo que se sabe de cada tarea
  const tasks = new Map();
  const get = (id) => {
    if (!tasks.has(id)) tasks.set(id, { id, assigned: [], reportNotes: [], reports: [], first: null, last: null });
    return tasks.get(id);
  };
  const seen = (task, ms) => {
    if (!ms) return;
    task.first = task.first ? Math.min(task.first, ms) : ms;
    task.last = task.last ? Math.max(task.last, ms) : ms;
  };
  notifications.forEach((n) => {
    if (!n.taskId) return;
    const task = get(n.taskId);
    const at = toMs(n.createdAt);
    seen(task, at);
    if (n.type === 'task_assigned') task.assigned.push({ at: at || 0, email: normalizeEmail(n.userEmail), title: n.taskTitle, dueAt: toMs(n.dueAt), priority: n.priority });
    if (n.type === 'new_report') task.reportNotes.push({ at: at || 0, body: n.body || '', area: n.area || '' });
  });
  reports.forEach((r) => {
    if (!r.taskId) return;
    const task = get(r.taskId);
    task.reports.push(r);
    seen(task, toMs(r.createdAt));
  });

  // ── Estado actual en Firestore: ¿existe ya?, chat y subtareas que quedaron
  for (const task of tasks.values()) {
    const [snap, messages, subtasks] = await Promise.all([
      getDoc(doc(db, 'tasks', task.id)),
      getDocs(collection(db, 'tasks', task.id, 'messages')),
      getDocs(collection(db, 'tasks', task.id, 'subtasks')),
    ]);
    task.exists = snap.exists();
    task.messages = messages.docs.map((d) => d.data()).sort((a, b) => (toMs(a.createdAt) || 0) - (toMs(b.createdAt) || 0));
    task.subtasks = subtasks.docs.map((d) => d.data());
    task.messages.forEach((m) => seen(task, toMs(m.createdAt)));
  }

  // ── Armar cada tarea
  const candidates = [...tasks.values()].map((task) => {
    const notes = [];
    // El último grupo de avisos de asignación refleja el título y los asignados finales
    const assigned = [...task.assigned].sort((a, b) => a.at - b.at);
    const latestAt = assigned.length ? assigned[assigned.length - 1].at : 0;
    const latestBatch = assigned.filter((a) => a.at >= latestAt - BATCH_WINDOW_MS);
    const latest = latestBatch[latestBatch.length - 1];

    let title = (latest?.title || '').trim();
    if (!title) {
      // El aviso de reporte dice: … envió un reporte: "X" para la tarea "TÍTULO" (área)
      const fromNote = task.reportNotes.map((n) => (n.body.match(/para la tarea "(.+?)"(?: \(|$)/) || [])[1]).find(Boolean);
      if (fromNote && fromNote !== 'Tarea sin título') { title = fromNote.trim(); notes.push('título tomado de un aviso de reporte'); }
    }

    // Con avisos de asignación, los asignados son los del último grupo. Sin ellos, lo
    // único que queda es quién envió reportes: un secretario puede reportar sin estar
    // asignado, así que eso solo se usa cuando no hay nada mejor.
    const reportAuthors = task.reports.map((r) => normalizeEmail(r.createdBy)).filter((e) => e.includes('@'));
    const originalEmails = [...new Set((latestBatch.length ? latestBatch.map((a) => a.email) : reportAuthors).filter(Boolean))];
    if (!latestBatch.length && originalEmails.length) notes.push('asignado deducido de quien envió el reporte');
    // Un director solo ve las tareas que tiene asignadas: si envió un reporte, estaba
    // asignado. Las delegaciones no dejan aviso de asignación, así que es la única huella.
    reportAuthors.forEach((email) => {
      const author = currentAccount(email);
      if (author && author.role === 'director' && !originalEmails.includes(email)) {
        originalEmails.push(email);
        notes.push(`${email} agregado: envió un reporte en esta tarea (había sido delegado)`);
      }
    });
    if (!latestBatch.length && task.reports.length === 0) {
      // Solo queda el nombre de quien reportó, dentro del texto del aviso
      task.reportNotes.forEach((n) => {
        const name = (n.body.match(/^(.+?) envió un reporte/) || [])[1];
        const user = name && userByName.get(plain(name).replace(/^(C|LIC|MTRO|MTRA|ING|LD|TSU|LC|LAP) /, ''));
        if (user && !originalEmails.includes(normalizeEmail(user.email))) originalEmails.push(normalizeEmail(user.email));
      });
    }
    const current = [];
    originalEmails.forEach((email) => {
      const user = currentAccount(email);
      if (!user) { notes.push(`${email} ya no tiene cuenta activa`); return; }
      if (normalizeEmail(user.email) !== email) notes.push(`${email} → ${user.email}`);
      if (!current.some((u) => u.id === user.id)) current.push(user);
    });

    const knownAreas = [...new Set([...task.reports.map((r) => r.area), ...task.reportNotes.map((n) => n.area)].filter(Boolean).map((a) => resolveAreaName(a)))];
    const areas = knownAreas.length ? knownAreas : [...new Set(current.map(unitOf).filter(Boolean))];
    if (!knownAreas.length && areas.length) notes.push('área deducida de los asignados');

    const dueAt = latest?.dueAt || [...assigned].reverse().find((a) => a.dueAt)?.dueAt || null;
    if (!dueAt) notes.push('sin fecha límite conocida: se usa la de creación + 7 días');
    const lastMessage = task.messages[task.messages.length - 1];
    const completedSubtasks = task.subtasks.filter((s) => s.status === 'completada').length;

    return {
      id: task.id,
      title,
      current,
      originalEmails,
      areas,
      priority: latest?.priority || 'media',
      dueAt: dueAt || ((task.first || Date.now()) + 7 * 24 * 60 * 60 * 1000),
      createdAt: task.first || Date.now(),
      lastActivity: task.last || task.first || 0,
      reports: task.reports,
      messages: task.messages,
      lastMessage,
      subtasks: task.subtasks,
      completedSubtasks,
      hasAssignmentNotices: latestBatch.length > 0,
      evidence: task.reports.length * 1000 + task.messages.length * 10 + task.subtasks.length * 10 + task.assigned.length,
      exists: task.exists,
      notes,
    };
  });

  // ── Decidir qué se recrea
  const groups = new Map();
  const addToGroup = (c) => {
    const key = plain(c.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  };
  candidates.forEach((c) => {
    if (c.exists) {
      c.skip = 'ya existe';
      // Una tarea que ya existe sigue contando al buscar copias: si no, al volver a
      // ejecutar el script se recrearía una de sus copias repetidas
      if (c.title) addToGroup(c);
      return;
    }
    if (!c.title) { c.skip = 'no se pudo saber el título'; return; }
    if (isTestTitle(c.title)) { c.skip = 'tarea de prueba'; return; }
    if (c.current.length === 0) { c.skip = 'ningún asignado tiene cuenta activa'; return; }
    // Sin avisos de asignación y sin ningún reporte guardado: solo queda el aviso de un
    // reporte que ya no existe. Son las pruebas de los primeros días del sistema.
    if (!c.hasAssignmentNotices && c.reports.length === 0) { c.skip = 'solo queda el aviso de un reporte borrado (pruebas iniciales)'; return; }
    addToGroup(c);
  });
  groups.forEach((list) => {
    if (list.length < 2) return;
    // De varias copias con el mismo título se conserva la que ya existe y, si ninguna
    // existe, la que tiene más historia
    list.sort((a, b) => Number(b.exists) - Number(a.exists) || b.evidence - a.evidence || b.lastActivity - a.lastActivity);
    list.slice(1).forEach((copy) => { if (!copy.exists) copy.skip = `copia repetida de ${list[0].id.slice(0, 8)}…`; });
  });

  const toCreate = candidates.filter((c) => !c.skip).sort((a, b) => b.lastActivity - a.lastActivity);
  const skipped = candidates.filter((c) => c.skip).sort((a, b) => b.lastActivity - a.lastActivity);

  console.log(`\nTareas con rastro: ${candidates.length} · se recrean: ${toCreate.length} · se omiten: ${skipped.length}\n`);
  console.log('SE RECREAN');
  toCreate.forEach((c) => {
    console.log(`  ${c.id.slice(0, 8)}… "${c.title}"`);
    console.log(`      creada ${day(c.createdAt)} · vence ${day(c.dueAt)} · prioridad ${c.priority} · chat ${c.messages.length} · subtareas ${c.completedSubtasks}/${c.subtasks.length} · reportes ${c.reports.length}`);
    console.log(`      asignados (${c.current.length}): ${c.current.map((u) => u.email).join(', ')}`);
    console.log(`      áreas: ${c.areas.join(' / ') || '(ninguna)'}`);
    if (c.notes.length) console.log(`      notas: ${c.notes.join('; ')}`);
  });
  console.log('\nSE OMITEN');
  skipped.forEach((c) => console.log(`  ${c.id.slice(0, 8)}… "${c.title || '(sin título)'}" — ${c.skip}${c.messages.length || c.reports.length ? ` · chat ${c.messages.length}, reportes ${c.reports.length}` : ''}`));

  const buildDoc = (c) => {
    const assignedTo = c.current.map((u) => normalizeEmail(u.email));
    const names = c.current.map((u) => u.displayName || u.email);
    const secretarias = [...new Set([
      ...getSecretariasForAreas(c.areas),
      ...c.current.flatMap((u) => getSecretariasForAreas([u.secretaria || u.area || u.department])),
    ])];
    const data = {
      title: c.title,
      description: DESCRIPTION,
      priority: ['alta', 'media', 'baja'].includes(c.priority) ? c.priority : 'media',
      areas: c.areas,
      area: c.areas[0] || null,
      secretarias,
      assignedTo,
      assignedToNames: names,
      assignments: assignedTo.map((email, i) => ({ email, name: names[i], status: 'pendiente', completedAt: null })),
      status: 'pendiente',
      completedBy: [],
      createdBy: '',
      createdByName: 'Reconstruida',
      createdAt: Timestamp.fromMillis(c.createdAt),
      updatedAt: serverTimestamp(),
      dueAt: Timestamp.fromMillis(c.dueAt),
      tags: ['reconstruida'],
      estimatedHours: null,
      isRecurring: false,
      recurrencePattern: null,
      isCoordinationTask: false,
      subtaskCount: 0,
      subtasksCompleted: 0,
      coordinationProgress: 0,
      progressPercentage: c.subtasks.length ? Math.round((c.completedSubtasks / c.subtasks.length) * 100) : 0,
      reports: c.reports.map((r) => r.id),
      reconstruida: true,
      reconstruccion: {
        fecha: serverTimestamp(),
        asignadosOriginales: c.originalEmails,
        notas: c.notes,
      },
    };
    const lastReport = c.reports.map((r) => toMs(r.createdAt)).filter(Boolean).sort((a, b) => b - a)[0];
    if (lastReport) data.lastReportDate = Timestamp.fromMillis(lastReport);
    if (c.lastMessage && toMs(c.lastMessage.createdAt)) {
      data.lastMessageAt = Timestamp.fromMillis(toMs(c.lastMessage.createdAt));
      data.lastMessageBy = c.lastMessage.author || '';
      data.lastMessageByEmail = c.lastMessage.authorEmail || '';
    }
    return data;
  };

  // El plan queda guardado junto al respaldo (sin los objetos especiales de Firestore)
  const planFile = join(backupDir, 'plan-reconstruccion.json');
  writeFileSync(planFile, JSON.stringify({
    recrear: toCreate.map((c) => ({ id: c.id, title: c.title, creada: day(c.createdAt), vence: day(c.dueAt), prioridad: c.priority, asignados: c.current.map((u) => u.email), asignadosOriginales: c.originalEmails, areas: c.areas, chat: c.messages.length, subtareas: c.subtasks.length, reportes: c.reports.length, notas: c.notes })),
    omitir: skipped.map((c) => ({ id: c.id, title: c.title, motivo: c.skip })),
  }, null, 2));
  console.log(`\nPlan guardado en ${planFile}`);

  if (!APPLY) {
    if (args.includes('--muestra') && toCreate.length) {
      console.log('\nEjemplo del documento que se escribiría:');
      console.log(JSON.stringify(buildDoc(toCreate[1] || toCreate[0]), (_k, v) => (v && typeof v === 'object' && typeof v.toMillis === 'function' ? new Date(v.toMillis()).toISOString() : v && v._methodName ? '(hora del servidor)' : v), 2));
    }
    console.log('\nSOLO MOSTRAR: no se escribió nada. Para crear las tareas: --apply');
    return;
  }
  if (toCreate.length === 0) {
    console.log('\nNo hay nada que crear.');
    return;
  }
  const batch = writeBatch(db);
  toCreate.forEach((c) => batch.set(doc(db, 'tasks', c.id), buildDoc(c)));
  await batch.commit();
  console.log(`\nHecho: ${toCreate.length} tareas recreadas.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('\nError:', error?.code || '', error?.message || error);
  process.exit(1);
});
