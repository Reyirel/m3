// auditarDatosAntesDeMigrar.mjs
// Revisión previa a la migración a Firebase Auth (docs/MIGRACION_FIREBASE_AUTH.md).
//
// SOLO LEE. No escribe, no borra y no muestra contraseñas ni hashes: imprime conteos
// y, cuando un registro necesita corregirse, el correo o el identificador para ubicarlo.
//
// Usa la misma configuración pública que la app y entra sin sesión, igual que los demás
// scripts de esta carpeta. Si las reglas seguras ya están desplegadas, la lectura se
// rechaza y el script lo dice: en ese caso la base de datos ya está cerrada.
//
// Uso:  node scripts/auditarDatosAntesDeMigrar.mjs

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, getDoc, getDocs, getCountFromServer,
} from 'firebase/firestore';
import {
  SECRETARIAS, applyOrgStructure, sanitizeOrgStructure, resolveAreaName, getSecretariasForAreas,
} from '../config/areas.js';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'infra-sublime-464215-m5.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'infra-sublime-464215-m5',
};

const db = getFirestore(initializeApp(firebaseConfig));

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();
const hashFormat = (hash) => {
  if (typeof hash !== 'string' || !hash) return 'sin contraseña guardada';
  if (hash.startsWith('pbkdf2:')) return 'pbkdf2 (se conserva)';
  if (hash.startsWith('sha256:')) return 'sha256 (se conserva)';
  return 'antiguo de 32 bits (necesita contraseña nueva)';
};
const CANONICAL_STATUSES = new Set(['pendiente', 'en_proceso', 'en_revision', 'cerrada']);
const CLOSED = new Set(['cerrada', 'cerrado', 'completada', 'completado']);

const countBy = (items, keyOf) => items.reduce((acc, item) => {
  const key = keyOf(item);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const printCounts = (counts) => Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([key, value]) => console.log(`    ${String(value).padStart(5)}  ${key}`));
const printList = (title, items, limit = 15) => {
  if (items.length === 0) return;
  console.log(`  ${title}: ${items.length}`);
  items.slice(0, limit).forEach((item) => console.log(`      - ${item}`));
  if (items.length > limit) console.log(`      … y ${items.length - limit} más`);
};

async function main() {
  console.log(`Proyecto: ${firebaseConfig.projectId}  (solo lectura, sin sesión)\n`);

  // ── ¿La base de datos responde sin sesión?
  let usersSnap;
  try {
    usersSnap = await getDocs(collection(db, 'users'));
  } catch (error) {
    if (error?.code === 'permission-denied') {
      console.log('La base de datos RECHAZA lecturas sin sesión: las reglas seguras ya están activas.');
      console.log('Esta revisión solo sirve antes de migrar.');
      process.exit(0);
    }
    throw error;
  }
  console.log('⚠️  La base de datos RESPONDE sin sesión: las reglas desplegadas están abiertas.\n');

  // Organigrama vigente (si el administrador lo editó, manda sobre config/areas.js)
  try {
    const orgSnap = await getDoc(doc(db, 'metadata', 'orgStructure'));
    const structure = orgSnap.exists() ? sanitizeOrgStructure(orgSnap.data()) : null;
    if (structure) applyOrgStructure(structure);
    console.log(`Organigrama: ${structure ? 'el guardado en Firestore' : 'el inicial de config/areas.js'} (${SECRETARIAS.length} secretarías)\n`);
  } catch (error) {
    if (error?.code === 'permission-denied') {
      console.log('⚠️  Organigrama: las reglas desplegadas NO dejan leer `metadata`. En producción el');
      console.log('    organigrama editable no se guarda ni se lee; se usa el inicial de config/areas.js\n');
    } else {
      console.log(`Organigrama: no se pudo leer (${error?.code || error?.message}); se usa el inicial de config/areas.js\n`);
    }
  }
  const canonicalSecretarias = new Set(SECRETARIAS);

  // ── USUARIOS
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const activeUsers = users.filter((u) => u.active !== false);
  console.log(`USUARIOS: ${users.length} (${activeUsers.length} activos)`);
  console.log('  Por rol:');
  printCounts(countBy(users, (u) => u.role || '(sin rol)'));
  console.log('  Contraseña guardada (usuarios activos):');
  printCounts(countBy(activeUsers, (u) => hashFormat(u.password)));

  const withTempPassword = users.filter((u) => typeof u.tempPassword === 'string' && u.tempPassword);
  if (withTempPassword.length > 0) {
    console.log(`  ⚠️  ${withTempPassword.length} usuarios tienen una contraseña temporal guardada en texto claro (campo tempPassword)`);
  }

  const emailCounts = countBy(users.filter((u) => u.email), (u) => normalizeEmail(u.email));
  printList('Correos repetidos (la migración necesita uno por cuenta)',
    Object.entries(emailCounts).filter(([, n]) => n > 1).map(([email, n]) => `${email} ×${n}`));
  printList('Usuarios sin correo', users.filter((u) => !u.email).map((u) => `id ${u.id}`));
  printList('Correos con mayúsculas o espacios (deben ir en minúsculas)',
    users.filter((u) => u.email && u.email !== normalizeEmail(u.email)).map((u) => u.email));

  // El secretario ve las tareas de su secretaría solo si su `area` es el nombre canónico
  const secretarios = activeUsers.filter((u) => u.role === 'secretario');
  printList('Secretarios cuya área NO es el nombre exacto de una secretaría (no verían las tareas de su secretaría)',
    secretarios
      .filter((u) => !canonicalSecretarias.has(u.area))
      .map((u) => {
        const resolved = resolveAreaName(String(u.area || u.department || '').trim());
        const hint = canonicalSecretarias.has(resolved) ? ` → debería decir "${resolved}"` : ' → no corresponde a ninguna secretaría';
        return `${normalizeEmail(u.email)}: area = ${JSON.stringify(u.area ?? null)}${hint}`;
      }));

  const userEmails = new Set(users.map((u) => normalizeEmail(u.email)).filter(Boolean));

  // ── TAREAS
  const tasksSnap = await getDocs(collection(db, 'tasks'));
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const live = tasks.filter((t) => !t.deleted);
  const open = live.filter((t) => !CLOSED.has(String(t.status || '').toLowerCase()));
  console.log(`\nTAREAS: ${tasks.length} (${live.length} fuera de la papelera, ${open.length} abiertas)`);
  console.log('  Por estado (fuera de la papelera):');
  printCounts(countBy(live, (t) => t.status || '(sin estado)'));

  const nonCanonical = live.filter((t) => t.status && !CANONICAL_STATUSES.has(t.status));
  if (nonCanonical.length > 0) {
    console.log(`  Estados con nombre antiguo (la app los interpreta, las reglas no): ${nonCanonical.length}`);
  }

  const stringAssigned = live.filter((t) => typeof t.assignedTo === 'string' && t.assignedTo);
  const noSecretarias = live.filter((t) => !Array.isArray(t.secretarias));
  const emptySecretarias = live.filter((t) => Array.isArray(t.secretarias) && t.secretarias.length === 0);
  const fixable = noSecretarias.filter((t) => getSecretariasForAreas([t.area, ...(Array.isArray(t.areas) ? t.areas : [])].filter(Boolean)).length > 0);
  console.log(`  Sin el campo "secretarias" (los secretarios no las verían): ${noSecretarias.length}`
    + ` — ${noSecretarias.filter((t) => open.includes(t)).length} abiertas; ${fixable.length} se pueden rellenar a partir de su área`);
  if (emptySecretarias.length > 0) console.log(`  Con "secretarias" vacío: ${emptySecretarias.length}`);
  console.log(`  Con "assignedTo" como texto en vez de lista (las reglas no las reconocen): ${stringAssigned.length}`);

  const assignedEmails = new Set();
  let upperCaseAssigned = 0;
  live.forEach((t) => {
    const list = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
    list.forEach((email) => {
      if (typeof email !== 'string') return;
      if (email !== normalizeEmail(email)) upperCaseAssigned++;
      assignedEmails.add(normalizeEmail(email));
    });
  });
  if (upperCaseAssigned > 0) console.log(`  Asignaciones con el correo en mayúsculas o con espacios: ${upperCaseAssigned}`);
  printList('Correos asignados a tareas que no existen como usuario',
    [...assignedEmails].filter((email) => email && !userEmails.has(email)));

  const unknownSecretarias = new Set();
  live.forEach((t) => (Array.isArray(t.secretarias) ? t.secretarias : [])
    .forEach((s) => { if (!canonicalSecretarias.has(s)) unknownSecretarias.add(s); }));
  printList('Valores de "secretarias" que no son el nombre exacto de una secretaría', [...unknownSecretarias]);

  console.log(`  Subtareas por área: ${live.filter((t) => t.isAreaSubtask).length}`);
  console.log(`  Creadas sin conexión (ID off_…): ${tasks.filter((t) => t.id.startsWith('off_')).length}`);

  // ── LO DEMÁS (solo conteos, sin descargar los documentos)
  console.log('\nOTRAS COLECCIONES (conteo):');
  for (const name of ['task_reports', 'notifications', 'task_activity_log', 'user_push_tokens', 'areas']) {
    try {
      const count = (await getCountFromServer(collection(db, name))).data().count;
      console.log(`    ${String(count).padStart(6)}  ${name}`);
    } catch (error) {
      console.log(`         ?  ${name} (${error?.code || error?.message})`);
    }
  }

  console.log('\nFin. No se modificó nada.');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Error:', error?.code || '', error?.message || error);
  process.exit(1);
});
