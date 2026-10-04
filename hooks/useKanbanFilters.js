// hooks/useKanbanFilters.js
// Lógica de filtrado, ordenamiento y estadísticas del tablero Kanban

import { useState, useCallback, useMemo } from 'react';
import { toMs } from '../utils/dateUtils';
import { isTaskAssignedToUser } from '../utils/taskHelpers';

const DEFAULT_FILTERS = {
  searchText: '',
  area: '',
  responsible: '',
  priority: '',
  overdue: false,
  dueToday: false,
  dueThisWeek: false,
};

const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };
const WEEK_DAYS = 7;

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const endOfWeek = (today) => {
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + WEEK_DAYS);
  return weekEnd;
};

/** Vencida: tiene fecha límite, ya pasó y la tarea no está cerrada */
export const isTaskOverdue = (task) => {
  if (!task.dueAt || task.status === 'cerrada') return false;
  const dueMs = toMs(task.dueAt);
  return dueMs ? dueMs < Date.now() : false;
};

const isDueToday = (task, today) => {
  const dueMs = toMs(task.dueAt);
  return !!dueMs && task.status !== 'cerrada' && new Date(dueMs).toDateString() === today.toDateString();
};

// Vence entre hoy (desde el inicio del día) y los próximos 7 días
const isDueThisWeek = (task, today) => {
  const dueMs = toMs(task.dueAt);
  return !!dueMs && task.status !== 'cerrada' && dueMs >= today.getTime() && dueMs <= endOfWeek(today).getTime();
};

/** Tareas que pasan los filtros del tablero */
export const filterKanbanTasks = (taskList, filters) => {
  const search = (filters.searchText || '').toLowerCase();
  const today = startOfToday();
  return taskList.filter((task) => {
    if (search && !(task.title || '').toLowerCase().includes(search)) return false;
    if (filters.area && task.area !== filters.area) return false;
    // assignedTo es una lista de correos (o un solo correo en tareas antiguas)
    if (filters.responsible && !isTaskAssignedToUser(task, filters.responsible)) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.overdue && !isTaskOverdue(task)) return false;
    if (filters.dueToday && !isDueToday(task, today)) return false;
    if (filters.dueThisWeek && !isDueThisWeek(task, today)) return false;
    return true;
  });
};

/** Ordenar por prioridad (alta primero) o por fecha de creación (más reciente primero) */
export const sortKanbanTasks = (taskList, sortBy) => {
  const sorted = [...taskList];
  if (sortBy === 'priority') {
    // Una tarea sin prioridad conocida va al final
    const rank = (task) => PRIORITY_ORDER[task.priority] ?? Object.keys(PRIORITY_ORDER).length;
    sorted.sort((a, b) => rank(a) - rank(b));
  } else {
    sorted.sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0));
  }
  return sorted;
};

/** Conteos que muestra el tablero (vencidas, para hoy, esta semana, mías, por prioridad) */
export const kanbanTaskStats = (tasks, userEmail) => {
  const today = startOfToday();
  let overdueCount = 0;
  let todayCount = 0;
  let thisWeekCount = 0;
  let myTasksCount = 0;
  const priorityCounts = { alta: 0, media: 0, baja: 0 };

  tasks.forEach((task) => {
    if (isTaskOverdue(task)) overdueCount++;
    if (isDueToday(task, today)) todayCount++;
    if (isDueThisWeek(task, today)) thisWeekCount++;
    if (userEmail && isTaskAssignedToUser(task, userEmail)) myTasksCount++;
    if (task.priority in priorityCounts) priorityCounts[task.priority]++;
  });

  return { overdueCount, overdueTasksCount: overdueCount, todayCount, thisWeekCount, myTasksCount, priorityCounts };
};

export function useKanbanFilters(tasks = [], currentUser = null) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'priority'

  const applyFilters = useCallback((taskList) => filterKanbanTasks(taskList, filters), [filters]);
  const sortTasks = useCallback((taskList) => sortKanbanTasks(taskList, sortBy), [sortBy]);

  const userEmail = currentUser?.email || '';
  const taskStats = useMemo(() => kanbanTaskStats(tasks, userEmail), [tasks, userEmail]);

  const getFilteredByStatus = useCallback((statusKey, allTasks) => {
    const byStatus = allTasks.filter(t => (t.status || 'pendiente') === statusKey);
    const filtered = applyFilters(byStatus);
    const sorted = sortTasks(filtered);
    return { byStatus, filtered, sorted };
  }, [applyFilters, sortTasks]);

  const hasActiveFilters = !!(
    filters.searchText || filters.area || filters.responsible ||
    filters.priority || filters.overdue || filters.dueToday || filters.dueThisWeek
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    isTaskOverdue,
    applyFilters,
    sortTasks,
    taskStats,
    getFilteredByStatus,
    hasActiveFilters,
    resetFilters,
  };
}
