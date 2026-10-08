// screens/home/homeSummary.js
// Qué muestra Inicio: lo que pide atención hoy. La lista completa de trabajo es la Bandeja.
import { toMs } from '../../utils/dateUtils';
import { isClosed, isInProgress, isInReview } from '../../utils/taskStatus';
import { isInboxTaskForUser } from '../inbox/inboxFilters';

const DAY_MS = 24 * 60 * 60 * 1000;
const byDueDate = (a, b) => (toMs(a.dueAt) || 0) - (toMs(b.dueAt) || 0);

/**
 * Agrupa las tareas del usuario (las mismas que ve en su Bandeja) por urgencia.
 * @param {Array} tasks
 * @param {Object} user
 * @param {number} now - Hora actual en milisegundos
 * @returns {{ overdue: Array, today: Array, review: Array, upcoming: Array, inProgress: Array, openCount: number }}
 */
export const buildHomeSummary = (tasks = [], user, now = Date.now()) => {
  const date = new Date(now);
  const endOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  const endOfWeek = endOfToday + 6 * DAY_MS;

  const open = tasks.filter((task) => isInboxTaskForUser(task, user) && !isClosed(task.status));
  const overdue = [];
  const today = [];
  const upcoming = [];

  open.forEach((task) => {
    const due = toMs(task.dueAt);
    if (!due) return;
    if (due < now) overdue.push(task);
    else if (due < endOfToday) today.push(task);
    else if (due < endOfWeek) upcoming.push(task);
  });

  return {
    // La más atrasada primero; en las demás, la que vence antes
    overdue: overdue.sort(byDueDate),
    today: today.sort(byDueDate),
    upcoming: upcoming.sort(byDueDate),
    review: open.filter((task) => isInReview(task.status)).sort(byDueDate),
    inProgress: open.filter((task) => isInProgress(task.status)).sort(byDueDate),
    openCount: open.length,
  };
};

/** Búsqueda de Inicio: título, descripción, asignados y etiquetas */
export const searchTasks = (tasks = [], user, text = '') => {
  const query = text.toLowerCase().trim();
  if (!query) return [];
  const has = (value) => typeof value === 'string' && value.toLowerCase().includes(query);
  return tasks.filter((task) => isInboxTaskForUser(task, user) && (
    has(task.title)
    || has(task.description)
    || (Array.isArray(task.assignedTo) ? task.assignedTo.some(has) : has(task.assignedTo))
    || (Array.isArray(task.tags) && task.tags.some(has))
  ));
};
