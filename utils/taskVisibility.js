/**
 * utils/taskVisibility.js
 * Regla única de visibilidad de tareas por rol.
 *
 *   admin      → todas
 *   secretario → las asignadas a él, las de su secretaría y las de sus direcciones
 *   director   → solo las asignadas a él
 *
 * La usan la suscripción de tareas y las métricas; firestore.secure.rules aplica
 * la misma regla en el servidor con el campo `secretarias` de la tarea.
 */

import { resolveAreaName, getDireccionesBySecretaria } from '../config/areas';
import { isTaskAssignedToUser } from './taskHelpers';

const norm = (value) => (value || '').toLowerCase().trim();

/** Todas las áreas de una tarea (campo singular y plural), sin repetir */
export function getTaskAreas(task) {
  const areas = [task?.area, ...(Array.isArray(task?.areas) ? task.areas : [])];
  return [...new Set(areas.filter(Boolean))];
}

/** Nombre canónico de la secretaría (o área) del usuario */
export function getUserSecretaria(user) {
  return resolveAreaName((user?.area || user?.department || '').trim());
}

/**
 * ¿Puede el usuario ver la tarea?
 * @param {Object} task - Tarea
 * @param {Object} user - { role, email, area, direcciones }
 * @returns {boolean}
 */
export function canUserSeeTask(task, user) {
  if (!task || !user?.role) return false;
  if (user.role === 'admin') return true;

  if (isTaskAssignedToUser(task, user.email)) return true;
  if (user.role !== 'secretario') return false;

  const secretaria = getUserSecretaria(user);
  if (!secretaria) return false;

  // Tareas nuevas: secretarías calculadas al guardar (áreas + asignados)
  const taskSecretarias = Array.isArray(task.secretarias) ? task.secretarias.map(norm) : [];
  if (taskSecretarias.includes(norm(secretaria))) return true;

  // Tareas sin el campo: comparar TODAS las áreas de la tarea, resolviendo alias
  const allowedAreas = new Set(
    [secretaria, ...getDireccionesBySecretaria(secretaria), ...(user.direcciones || [])]
      .map((area) => norm(resolveAreaName((area || '').trim())))
      .filter(Boolean)
  );
  return getTaskAreas(task).some((area) => allowedAreas.has(norm(resolveAreaName(area.trim()))));
}

/** Filtra una lista de tareas a las que el usuario puede ver (sin las de la papelera) */
export function filterVisibleTasks(tasks, user) {
  return (tasks || []).filter((task) => !task.deleted && canUserSeeTask(task, user));
}
