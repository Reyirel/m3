// services/orgStructure.js
// Organigrama vigente (Firestore: metadata/orgStructure).
//
// - startOrgStructureSync(): mantiene config/areas.js igual al organigrama guardado,
//   para que permisos, selectores y reportes usen siempre el vigente.
// - moveDireccion(): mueve una dirección a otra secretaría y aplica el cambio a los
//   usuarios (qué direcciones tiene a cargo cada secretario) y a las tareas abiertas
//   (qué secretarías pueden verlas).
// - renameArea(): cambia el nombre de una secretaría o dirección y lo aplica a los
//   usuarios, tareas y reportes que usaban el nombre anterior.
// - removeArea(): elimina una dirección o una secretaría vacía, si ya nadie la usa.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AREA_ALIASES,
  applyOrgStructure,
  getAreaNameError,
  getOrgStructure,
  getSecretariasForAreas,
  moveDireccionInStructure,
  removeAreaFromStructure,
  renameAreaInStructure,
  resolveAreaName,
  sanitizeOrgStructure,
} from '../config/areas';
import { getAllUsers, invalidateUsersDirectory } from './usersDirectory';
import { isClosed } from '../utils/taskStatus';
import logger from './Logger';

const ORG_CACHE_KEY = '@org_structure';
const BATCH_LIMIT = 400;
// Sin conexión Firestore deja la escritura en cola y no responde hasta sincronizar:
// pasado este tiempo se sigue adelante (el cambio ya quedó aplicado en este dispositivo)
const SAVE_TIMEOUT_MS = 8000;

const orgDocRef = () => doc(db, 'metadata', 'orgStructure');
const areaKey = (name) => resolveAreaName((name || '').trim()).toLowerCase();
const sameArea = (a, b) => !!areaKey(a) && areaKey(a) === areaKey(b);

/**
 * Mantener el organigrama de la app igual al guardado en Firestore.
 * Mientras responde el servidor se usa la última copia guardada en el dispositivo.
 * @returns {() => void} Función para dejar de escuchar
 */
export function startOrgStructureSync() {
  let gotServerData = false;

  AsyncStorage.getItem(ORG_CACHE_KEY)
    .then((cached) => {
      if (cached && !gotServerData) applyOrgStructure(JSON.parse(cached));
    })
    .catch(() => {});

  return onSnapshot(
    orgDocRef(),
    (snapshot) => {
      if (!snapshot.exists()) return; // aún no se ha editado: sigue el organigrama inicial
      const structure = sanitizeOrgStructure(snapshot.data());
      if (!structure) return;
      gotServerData = true;
      applyOrgStructure(structure);
      AsyncStorage.setItem(ORG_CACHE_KEY, JSON.stringify(structure)).catch(() => {});
    },
    (error) => logger.warn('OrgStructure', 'No se pudo leer el organigrama', { code: error?.code })
  );
}

/** Guardar el organigrama completo (y aplicarlo de inmediato en este dispositivo) */
export async function saveOrgStructure(structure) {
  const clean = sanitizeOrgStructure(structure);
  if (!clean) throw new Error('El organigrama no es válido');
  applyOrgStructure(clean);
  await Promise.race([
    setDoc(orgDocRef(), clean),
    new Promise((resolve) => setTimeout(resolve, SAVE_TIMEOUT_MS)),
  ]);
  AsyncStorage.setItem(ORG_CACHE_KEY, JSON.stringify(clean)).catch(() => {});
  return clean;
}

/**
 * Cambios que hay que hacer en los usuarios cuando una dirección pasa de una secretaría a otra:
 *   - el secretario de origen deja de tenerla a cargo
 *   - el secretario de destino la recibe
 *   - el titular de la dirección queda adscrito a la secretaría de destino
 * @returns {Array<{ id: string, data: Object }>}
 */
export function planUserUpdates(users, direccion, fromSecretaria, toSecretaria) {
  const updates = [];
  const without = (list) => (Array.isArray(list) ? list.filter((item) => !sameArea(item, direccion)) : []);
  const withAdded = (list) => {
    const base = Array.isArray(list) ? list : [];
    return base.some((item) => sameArea(item, direccion)) ? base : [...base, direccion];
  };
  const changed = (before, after) => JSON.stringify(before || []) !== JSON.stringify(after);

  users.forEach((user) => {
    const data = {};
    const ownArea = user.area || user.department;

    if (user.role === 'secretario' && sameArea(ownArea, fromSecretaria)) {
      const direcciones = without(user.direcciones);
      const areasPermitidas = without(user.areasPermitidas);
      if (changed(user.direcciones, direcciones)) data.direcciones = direcciones;
      if (changed(user.areasPermitidas, areasPermitidas)) data.areasPermitidas = areasPermitidas;
    } else if (user.role === 'secretario' && sameArea(ownArea, toSecretaria)) {
      const direcciones = withAdded(user.direcciones);
      if (changed(user.direcciones, direcciones)) data.direcciones = direcciones;
      // areasPermitidas solo se toca si el secretario ya usa esa lista
      if (Array.isArray(user.areasPermitidas) && user.areasPermitidas.length > 0) {
        const areasPermitidas = withAdded(user.areasPermitidas);
        if (changed(user.areasPermitidas, areasPermitidas)) data.areasPermitidas = areasPermitidas;
      }
    } else if (user.role !== 'secretario' && user.role !== 'admin') {
      const isTitular = sameArea(ownArea, direccion)
        || (user.areasPermitidas || []).some((item) => sameArea(item, direccion));
      if (isTitular && !sameArea(user.secretaria, toSecretaria)) data.secretaria = toSecretaria;
    }

    if (Object.keys(data).length > 0) updates.push({ id: user.id, data });
  });
  return updates;
}

/**
 * Secretarías que pueden ver una tarea, con el organigrama vigente:
 * las de sus áreas y las de sus asignados (misma regla que al crear la tarea).
 */
export function computeTaskSecretarias(task, secretariaByEmail = {}) {
  const areas = [task.area, ...(Array.isArray(task.areas) ? task.areas : [])].filter(Boolean);
  const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
  return [...new Set([
    ...getSecretariasForAreas(areas),
    ...assigned.map((email) => secretariaByEmail[(email || '').toLowerCase().trim()]).filter(Boolean),
  ])];
}

async function commitInBatches(operations) {
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    operations.slice(i, i + BATCH_LIMIT).forEach(({ ref, data }) => batch.update(ref, data));
    await batch.commit();
  }
}

/**
 * Aplicar a usuarios y tareas el paso de una dirección de una secretaría a otra.
 * Se puede volver a llamar sin riesgo: solo escribe lo que todavía no coincide.
 * @returns {Promise<{ users: number, tasks: number }>}
 */
export async function applyDireccionMove(direccion, fromSecretaria, toSecretaria) {
  // 1. Usuarios: direcciones a cargo de cada secretario y adscripción del titular
  const users = await getAllUsers({ force: true });
  const userUpdates = planUserUpdates(users, direccion, fromSecretaria, toSecretaria);
  await commitInBatches(userUpdates.map((u) => ({ ref: doc(db, 'users', u.id), data: u.data })));
  invalidateUsersDirectory();

  // Secretaría de cada usuario ya con el organigrama y la adscripción nuevos
  const patched = new Map(userUpdates.map((u) => [u.id, u.data]));
  const secretariaByEmail = {};
  users.forEach((user) => {
    const merged = { ...user, ...(patched.get(user.id) || {}) };
    const email = (merged.email || '').toLowerCase().trim();
    if (!email) return;
    secretariaByEmail[email] = getSecretariasForAreas([merged.secretaria || merged.area || merged.department])[0] || null;
  });

  // 2. Tareas abiertas de esa dirección: qué secretarías pueden verlas
  const tasksRef = collection(db, 'tasks');
  const [byArea, byAreas] = await Promise.all([
    getDocs(query(tasksRef, where('area', '==', direccion))),
    getDocs(query(tasksRef, where('areas', 'array-contains', direccion))),
  ]);
  const tasks = new Map();
  [...byArea.docs, ...byAreas.docs].forEach((snap) => tasks.set(snap.id, { id: snap.id, ...snap.data() }));

  const taskUpdates = [];
  tasks.forEach((task) => {
    // Las tareas cerradas conservan a quién correspondían cuando se cerraron
    if (task.deleted || isClosed(task.status)) return;
    const secretarias = computeTaskSecretarias(task, secretariaByEmail);
    const before = Array.isArray(task.secretarias) ? task.secretarias : [];
    if ([...before].sort().join('|') !== [...secretarias].sort().join('|')) {
      taskUpdates.push({ ref: doc(db, 'tasks', task.id), data: { secretarias } });
    }
  });
  await commitInBatches(taskUpdates);

  return { users: userUpdates.length, tasks: taskUpdates.length };
}

/**
 * Mover una dirección a otra secretaría (o cambiarla de posición) y aplicar el cambio
 * en toda la app.
 *
 * @param {string} direccion - Dirección que se mueve
 * @param {string} toSecretaria - Secretaría de destino
 * @param {number} [toIndex] - Posición dentro de la secretaría de destino
 * @returns {Promise<{ changed: boolean, fromSecretaria: string|null, users: number, tasks: number, pending?: boolean }>}
 *   `pending: true` → el organigrama se guardó pero falta aplicar el cambio a usuarios y
 *   tareas (sin conexión, por ejemplo); se completa llamando a applyDireccionMove().
 */
export async function moveDireccion(direccion, toSecretaria, toIndex) {
  const { structure, fromSecretaria, changed } = moveDireccionInStructure(
    getOrgStructure(), direccion, toSecretaria, toIndex
  );
  if (!changed) return { changed: false, fromSecretaria, users: 0, tasks: 0 };

  // El organigrama primero: desde aquí toda la app resuelve la dirección en su nueva secretaría
  await saveOrgStructure(structure);
  if (fromSecretaria === toSecretaria) return { changed: true, fromSecretaria, users: 0, tasks: 0 };

  try {
    const applied = await applyDireccionMove(direccion, fromSecretaria, toSecretaria);
    return { changed: true, fromSecretaria, ...applied };
  } catch (error) {
    logger.error('OrgStructure', 'El organigrama se guardó, pero no se pudo aplicar a usuarios o tareas', error);
    return { changed: true, fromSecretaria, users: 0, tasks: 0, pending: true };
  }
}

// ─── Renombrar y eliminar ──────────────────────────────────────────────────────

// Campos de usuarios y tareas que guardan nombres de área
const USER_NAME_FIELDS = ['area', 'department', 'secretaria'];
const USER_LIST_FIELDS = ['direcciones', 'areasPermitidas'];
const TASK_NAME_FIELDS = ['area'];
const TASK_LIST_FIELDS = ['areas', 'secretarias'];

const isArea = (value, name) => typeof value === 'string' && sameArea(value, name);

// Cambios para que un registro use el nombre nuevo donde tenía el viejo
const renameInRecord = (record, oldName, newName, nameFields, listFields) => {
  const data = {};
  nameFields.forEach((field) => {
    if (record[field] !== newName && isArea(record[field], oldName)) data[field] = newName;
  });
  listFields.forEach((field) => {
    if (!Array.isArray(record[field])) return;
    const renamed = [...new Set(record[field].map((item) => (isArea(item, oldName) ? newName : item)))];
    if (JSON.stringify(renamed) !== JSON.stringify(record[field])) data[field] = renamed;
  });
  return data;
};

const planRenames = (records, oldName, newName, nameFields, listFields) => records
  .map((record) => ({ id: record.id, data: renameInRecord(record, oldName, newName, nameFields, listFields) }))
  .filter((update) => Object.keys(update.data).length > 0);

/**
 * Cambios en los usuarios cuando un área cambia de nombre: su área, su secretaría y
 * las direcciones que tienen a cargo.
 * @returns {Array<{ id: string, data: Object }>}
 */
export function planUserRenames(users, oldName, newName) {
  return planRenames(users, oldName, newName, USER_NAME_FIELDS, USER_LIST_FIELDS);
}

/**
 * Cambios en las tareas cuando un área cambia de nombre.
 * @returns {Array<{ id: string, data: Object }>}
 */
export function planTaskRenames(tasks, oldName, newName) {
  return planRenames(tasks, oldName, newName, TASK_NAME_FIELDS, TASK_LIST_FIELDS);
}

// El nombre y las variantes con las que pudo guardarse (config/areas.js → AREA_ALIASES)
const storedNamesOf = (name) => [
  ...new Set([name, ...Object.keys(AREA_ALIASES).filter((alias) => AREA_ALIASES[alias] === name)]),
];

// Tareas que mencionan un área, abiertas o no
async function findTasksUsing(name) {
  const tasksRef = collection(db, 'tasks');
  const snapshots = await Promise.all(storedNamesOf(name).flatMap((stored) => [
    getDocs(query(tasksRef, where('area', '==', stored))),
    getDocs(query(tasksRef, where('areas', 'array-contains', stored))),
    getDocs(query(tasksRef, where('secretarias', 'array-contains', stored))),
  ]));
  const tasks = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((snap) => tasks.set(snap.id, { id: snap.id, ...snap.data() })));
  return [...tasks.values()];
}

/**
 * Aplicar a usuarios, tareas y reportes el cambio de nombre de un área.
 * Se puede volver a llamar sin riesgo: solo escribe lo que todavía tiene el nombre viejo.
 * @returns {Promise<{ users: number, tasks: number }>}
 */
export async function applyAreaRename(oldName, newName) {
  const users = await getAllUsers({ force: true });
  const userUpdates = planUserRenames(users, oldName, newName);
  await commitInBatches(userUpdates.map((u) => ({ ref: doc(db, 'users', u.id), data: u.data })));
  invalidateUsersDirectory();

  // Todas las tareas, también las cerradas: el área es la misma, solo cambia cómo se llama
  const taskUpdates = planTaskRenames(await findTasksUsing(oldName), oldName, newName);
  await commitInBatches(taskUpdates.map((t) => ({ ref: doc(db, 'tasks', t.id), data: t.data })));

  const reportsRef = collection(db, 'task_reports');
  const reportSnapshots = await Promise.all(
    storedNamesOf(oldName).map((stored) => getDocs(query(reportsRef, where('area', '==', stored))))
  );
  await commitInBatches(
    reportSnapshots.flatMap((snapshot) => snapshot.docs.map((snap) => ({ ref: snap.ref, data: { area: newName } })))
  );

  return { users: userUpdates.length, tasks: taskUpdates.length };
}

/**
 * Cambiar el nombre de una secretaría o dirección y aplicarlo en toda la app.
 * @returns {Promise<{ changed: boolean, users: number, tasks: number, pending?: boolean }>}
 *   `pending: true` → el organigrama se guardó pero falta aplicar el nombre a usuarios y
 *   tareas; se completa llamando a applyAreaRename().
 */
export async function renameArea(oldName, newName) {
  const name = (newName || '').trim();
  const current = getOrgStructure();
  const error = getAreaNameError(current, name, oldName);
  if (error) throw new Error(error);

  const { structure, changed } = renameAreaInStructure(current, oldName, name);
  if (!changed || name === oldName) return { changed: false, users: 0, tasks: 0 };

  // El organigrama primero. Mientras se aplica lo demás, las tareas siguen visibles para
  // su secretaría porque cada una guarda sus `secretarias`.
  await saveOrgStructure(structure);
  try {
    const applied = await applyAreaRename(oldName, name);
    return { changed: true, ...applied };
  } catch (applyError) {
    logger.error('OrgStructure', 'El nombre se guardó, pero no se pudo aplicar a usuarios o tareas', applyError);
    return { changed: true, users: 0, tasks: 0, pending: true };
  }
}

/**
 * Quién usa todavía un área: usuarios activos adscritos a ella y tareas abiertas.
 * @returns {Promise<{ users: number, tasks: number }>}
 */
export async function getAreaUsage(name) {
  const [users, tasks] = await Promise.all([getAllUsers({ force: true }), findTasksUsing(name)]);
  return {
    users: users.filter(
      (user) => user.active !== false && USER_NAME_FIELDS.some((field) => isArea(user[field], name))
    ).length,
    tasks: tasks.filter((task) => !task.deleted && !isClosed(task.status)).length,
  };
}

/**
 * Eliminar del organigrama una dirección, o una secretaría sin direcciones.
 * No se elimina si todavía tiene usuarios adscritos o tareas abiertas: quedarían fuera
 * del organigrama y ningún secretario las vería. Las tareas cerradas conservan el nombre.
 * @returns {Promise<{ removed: boolean, usage: { users: number, tasks: number } }>}
 */
export async function removeArea(name) {
  const usage = await getAreaUsage(name);
  if (usage.users > 0 || usage.tasks > 0) return { removed: false, usage };

  const { structure, changed } = removeAreaFromStructure(getOrgStructure(), name);
  if (!changed) return { removed: false, usage };
  await saveOrgStructure(structure);

  // Los secretarios dejan de tenerla en sus listas de direcciones a cargo
  try {
    const users = await getAllUsers();
    const operations = [];
    users.forEach((user) => {
      const data = {};
      USER_LIST_FIELDS.forEach((field) => {
        if (Array.isArray(user[field]) && user[field].some((item) => isArea(item, name))) {
          data[field] = user[field].filter((item) => !isArea(item, name));
        }
      });
      if (Object.keys(data).length > 0) operations.push({ ref: doc(db, 'users', user.id), data });
    });
    await commitInBatches(operations);
    invalidateUsersDirectory();
  } catch (error) {
    logger.warn('OrgStructure', 'El área se eliminó, pero sigue en la lista de algún secretario', { code: error?.code });
  }
  return { removed: true, usage };
}
