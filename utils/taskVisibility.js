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

/**
 * ¿Puede el usuario ver el reporte?
 *   admin      → todos
 *   cualquiera → los que él mismo envió
 *   los demás  → los de las tareas que puede ver
 *
 * @param {Object} report - Reporte ({ createdBy, taskId, area, secretarias, createdBySecretaria })
 * @param {Object|null} task - Tarea del reporte, si está entre las que el usuario tiene cargadas
 * @param {Object} user - { role, email, area, direcciones }
 * @returns {boolean}
 */
export function canUserSeeReport(report, task, user) {
  if (!report || !user?.role) return false;
  if (user.role === 'admin') return true;
  if (norm(report.createdBy) === norm(user.email)) return true;

  if (task) return !task.deleted && canUserSeeTask(task, user);

  // La tarea no está entre las del usuario (o ya no existe). Un director solo ve
  // reportes de tareas suyas; un secretario, los que el propio reporte ubica en su secretaría.
  if (user.role !== 'secretario') return false;
  return canUserSeeTask({
    areas: [report.area, report.createdBySecretaria].filter(Boolean),
    secretarias: report.secretarias,
    assignedTo: [],
  }, user);
}

/**
 * Reportes que el usuario puede ver, con los datos de su tarea (taskInfo)
 * @param {Array} reports - Reportes sin filtrar
 * @param {Array} tasks - Tareas que el usuario tiene cargadas (ya filtradas por rol)
 * @param {Object} user
 * @returns {Array}
 */
export function filterVisibleReports(reports, tasks, user) {
  const tasksById = new Map((tasks || []).map((task) => [task.id, task]));
  return (reports || [])
    .filter((report) => !report.deleted && canUserSeeReport(report, tasksById.get(report.taskId) || null, user))
    .map((report) => {
      const task = tasksById.get(report.taskId);
      return {
        ...report,
        taskInfo: task
          ? { title: task.title || 'Sin título', area: task.area || 'Sin área', assignedTo: task.assignedTo || [] }
          : report.taskInfo || { title: 'Tarea no disponible', area: report.area || 'Sin área', assignedTo: [] },
      };
    });
}

/** Filtra una lista de tareas a las que el usuario puede ver (sin las de la papelera) */
export function filterVisibleTasks(tasks, user) {
  return (tasks || []).filter((task) => !task.deleted && canUserSeeTask(task, user));
}
