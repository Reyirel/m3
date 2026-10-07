// respaldarYRastrearTareas.mjs
// SOLO LEE de Firestore. Hace dos cosas:
//   1. Guarda en esta computadora una copia de lo que queda (data/respaldo-<fecha>/),
//      carpeta que git ignora.
//   2. Busca el rastro de las tareas que ya no están: las notificaciones, los reportes y
//      el historial guardan el id, el título y a quién se asignó cada tarea.
//
// No muestra contraseñas ni hashes. La copia de `users` SÍ los contiene: bórrala cuando
// termine la migración a Firebase Auth.
//
// Uso:  node scripts/respaldarYRastrearTareas.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'infra-sublime-464215-m5.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'infra-sublime-464215-m5',
};
const db = getFirestore(initializeApp(firebaseConfig));

const toMs = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};
const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
const localDay = (ms) => (ms ? new Date(ms).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '?');
// Las fechas de Firestore se guardan como texto ISO para que el archivo sea legible
const jsonReplacer = (_key, value) => (value && typeof value === 'object' && typeof value.toMillis === 'function'
  ? { __fecha: new Date(value.toMillis()).toISOString() }
  : value);

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = join('data', `respaldo-${stamp}`);
mkdirSync(outDir, { recursive: true });

const readAll = async (name) => {
  const snapshot = await getDocs(collection(db, name));
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(docs, jsonReplacer, 2));
  return docs;
};

async function main() {
  console.log(`Proyecto: ${firebaseConfig.projectId} (solo lectura)\nCopia local en: ${outDir}\n`);

  const saved = {};
  for (const name of ['notifications', 'task_reports', 'task_activity_log', 'users', 'areas', 'user_push_tokens', 'tasks']) {
    try {
      saved[name] = await readAll(name);
      console.log(`  guardado ${String(saved[name].length).padStart(4)}  ${name}`);
    } catch (error) {
      saved[name] = [];
      console.log(`  NO se pudo leer ${name}: ${error?.code || error?.message}`);
    }
  }

  // ── Rastro de las tareas
  const tasks = new Map();
  const touch = (taskId) => {
    if (!taskId) return null;
    if (!tasks.has(taskId)) {
      tasks.set(taskId, { id: taskId, title: '', assignedTo: new Set(), priority: null, dueAt: null, firstSeen: null, lastSeen: null, sources: new Set() });
    }
    return tasks.get(taskId);
  };
  const seen = (task, ms, source) => {
    task.sources.add(source);
    if (!ms) return;
    if (!task.firstSeen || ms < task.firstSeen) task.firstSeen = ms;
    if (!task.lastSeen || ms > task.lastSeen) task.lastSeen = ms;
  };

  saved.notifications.forEach((n) => {
    const task = touch(n.taskId);
    if (!task) return;
    if (n.taskTitle && !task.title) task.title = n.taskTitle;
    if (n.type === 'task_assigned') {
      if (n.userEmail) task.assignedTo.add(String(n.userEmail).toLowerCase().trim());
      if (n.priority) task.priority = n.priority;
      if (n.dueAt) task.dueAt = toMs(n.dueAt);
    }
    seen(task, toMs(n.createdAt), `notificación ${n.type || ''}`.trim());
  });
  saved.task_reports.forEach((r) => {
    const task = touch(r.taskId);
    if (!task) return;
    if (!task.title && r.taskInfo?.title) task.title = r.taskInfo.title;
    seen(task, toMs(r.createdAt), 'reporte');
  });
  saved.task_activity_log.forEach((a) => {
    const task = touch(a.taskId);
    if (task) seen(task, toMs(a.timestamp), `historial ${a.action || ''}`.trim());
  });

  const existing = new Set(saved.tasks.map((t) => t.id));
  const missing = [...tasks.values()].filter((t) => !existing.has(t.id));
  const list = missing
    .map((t) => ({ ...t, assignedTo: [...t.assignedTo], sources: [...t.sources], dueAt: iso(t.dueAt), firstSeen: iso(t.firstSeen), lastSeen: iso(t.lastSeen), firstSeenMs: t.firstSeen, lastSeenMs: t.lastSeen }))
    .sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
  writeFileSync(join(outDir, 'tareas-que-faltan.json'), JSON.stringify(list.map(({ firstSeenMs, lastSeenMs, ...rest }) => rest), null, 2));

  console.log(`\nTAREAS con rastro en avisos, reportes o historial: ${tasks.size}`);
  console.log(`  de ellas ya NO existen en la base de datos: ${missing.length}`);
  console.log(`  con título conocido: ${list.filter((t) => t.title).length} · con asignados conocidos: ${list.filter((t) => t.assignedTo.length).length}`);

  const allMs = [
    ...saved.notifications.map((n) => toMs(n.createdAt)),
    ...saved.task_reports.map((r) => toMs(r.createdAt)),
    ...saved.task_activity_log.map((a) => toMs(a.timestamp)),
  ].filter(Boolean).sort((a, b) => a - b);
  if (allMs.length) {
    console.log(`\nACTIVIDAD registrada: del ${localDay(allMs[0])} al ${localDay(allMs[allMs.length - 1])}`);
    console.log(`  último movimiento: ${new Date(allMs[allMs.length - 1]).toLocaleString('es-MX')}`);
    const perDay = {};
    allMs.forEach((ms) => { const day = new Date(ms).toISOString().slice(0, 10); perDay[day] = (perDay[day] || 0) + 1; });
    console.log('  últimos días con movimiento:');
    Object.entries(perDay).slice(-8).forEach(([day, n]) => console.log(`    ${day}  ${n}`));
  }

  console.log('\nÚltimas tareas de las que hay rastro (para que reconozcas si son reales o de prueba):');
  list.slice(0, 12).forEach((t) => {
    console.log(`  - ${localDay(t.lastSeenMs)}  "${(t.title || '(sin título conocido)').slice(0, 70)}"  · asignados: ${t.assignedTo.length}`);
  });

  // ── ¿Quedaron el chat y las subtareas? Borrar una tarea no borra sus subcolecciones.
  let withMessages = 0;
  let withSubtasks = 0;
  let denied = false;
  for (const t of list.slice(0, 25)) {
    try {
      const [messages, subtasks] = await Promise.all([
        getCountFromServer(collection(db, 'tasks', t.id, 'messages')),
        getCountFromServer(collection(db, 'tasks', t.id, 'subtasks')),
      ]);
      if (messages.data().count > 0) withMessages++;
      if (subtasks.data().count > 0) withSubtasks++;
    } catch (error) {
      denied = error?.code === 'permission-denied';
      break;
    }
  }
  console.log(denied
    ? '\nCHAT y SUBTAREAS: las reglas no dejan consultarlos sin sesión (habrá que verlo con la cuenta de servicio).'
    : `\nCHAT y SUBTAREAS de las ${Math.min(25, list.length)} tareas más recientes que faltan: ${withMessages} conservan mensajes, ${withSubtasks} conservan subtareas.`);

  console.log(`\nListo. Nada se modificó en Firestore. Archivos en ${outDir}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Error:', error?.code || '', error?.message || error);
  process.exit(1);
});
