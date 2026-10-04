// screens/inbox/inboxFilters.js
// Qué tareas aparecen en la bandeja: las que le corresponden al usuario por su rol,
// después la búsqueda y los filtros. Funciones puras.
import { getDireccionesBySecretaria } from '../../config/areas';
import { isOverdue, toMs } from '../../utils/dateUtils';
import { isTaskAssignedToUser } from '../../utils/taskHelpers';
import { normalizeStatus } from '../../utils/taskStatus';

export const EMPTY_FILTERS = { status: [], priority: [], area: [], overdue: false };

export const hasActiveFilters = (filters) => filters.status.length > 0
  || filters.priority.length > 0
  || filters.area.length > 0
  || filters.overdue;

/** Quitar o agregar un valor en uno de los filtros de lista (status, priority, area) */
export const toggleFilterValue = (filters, key, value) => ({
  ...filters,
  [key]: filters[key].includes(value)
    ? filters[key].filter((item) => item !== value)
    : [...filters[key], value],
});

const lower = (value) => (value || '').toLowerCase().trim();

/**
 * ¿La tarea le corresponde al usuario?
 *   admin      → todas
 *   secretario → las de su secretaría y sus direcciones, las asignadas a él y las que creó
 *   director   → las de su área, las asignadas a él y las que creó
 */
export const isInboxTaskForUser = (task, user) => {
  if (!user) return false;
  if (user.role !== 'secretario' && user.role !== 'director') return true;

  const email = user.email?.toLowerCase();
  if (isTaskAssignedToUser(task, email) || task.createdBy?.toLowerCase() === email) return true;

  const userArea = user.area || user.department || '';
  const taskArea = lower(task.area);
  if (taskArea === lower(userArea)) return true;
  return user.role === 'secretario'
    && getDireccionesBySecretaria(userArea).some((direccion) => lower(direccion) === taskArea);
};

const matchesFilters = (task, searchText, filters) => {
  if (searchText) {
    const search = searchText.toLowerCase();
    if (!task.title?.toLowerCase().includes(search) && !task.description?.toLowerCase().includes(search)) return false;
  }
  if (filters.status.length > 0 && !filters.status.includes(normalizeStatus(task.status))) return false;
  if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
  if (filters.area.length > 0 && !filters.area.includes(task.area)) return false;
  if (filters.overdue && !isOverdue(task)) return false;
  return true;
};

/** Tareas de la bandeja, de la que vence primero a la que vence al final */
export const filterInboxTasks = (tasks, user, searchText, filters) => tasks
  .filter((task) => isInboxTaskForUser(task, user) && matchesFilters(task, searchText, filters))
  .sort((a, b) => (toMs(a.dueAt) || 0) - (toMs(b.dueAt) || 0));

/** Áreas que aparecen en las tareas, para ofrecerlas como filtro */
export const uniqueTaskAreas = (tasks) => [...new Set(tasks.map((task) => task.area).filter(Boolean))].sort();
