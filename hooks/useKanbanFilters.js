// hooks/useKanbanFilters.js
// Lógica de filtrado, ordenamiento y estadísticas del tablero Kanban

import { useState, useCallback, useMemo } from 'react';
import { toMs } from '../utils/dateUtils';

const DEFAULT_FILTERS = {
  searchText: '',
  area: '',
  responsible: '',
  priority: '',
  overdue: false,
  dueToday: false,
  dueThisWeek: false,
};

export function useKanbanFilters(tasks = [], currentUser = null) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'priority'

  const isTaskOverdue = useCallback((task) => {
    if (!task.dueAt || task.status === 'cerrada') return false;
    const dueMs = toMs(task.dueAt);
    return dueMs ? dueMs < Date.now() : false;
  }, []);

  const applyFilters = useCallback((taskList) => {
    return taskList.filter(task => {
      if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      if (filters.area && task.area !== filters.area) return false;
      if (filters.responsible && task.assignedTo !== filters.responsible) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.overdue && toMs(task.dueAt) >= Date.now()) return false;

      if (filters.dueToday) {
        const dueMs = toMs(task.dueAt);
        const dueDate = dueMs ? new Date(dueMs) : null;
        const today = new Date();
        if (!dueDate || dueDate.toDateString() !== today.toDateString() || task.status === 'cerrada') return false;
      }

      if (filters.dueThisWeek) {
        const dueMs = toMs(task.dueAt);
        const dueDate = dueMs ? new Date(dueMs) : null;
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (!dueDate || dueDate < today || dueDate > weekEnd || task.status === 'cerrada') return false;
      }

      return true;
    });
  }, [filters]);

  const sortTasks = useCallback((taskList) => {
    const sorted = [...taskList];
    if (sortBy === 'priority') {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      sorted.sort((a, b) => {
        const dateA = new Date(toMs(a.createdAt));
        const dateB = new Date(toMs(b.createdAt));
        return dateB - dateA;
      });
    }
    return sorted;
  }, [sortBy]);

  const taskStats = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const userEmail = currentUser?.email || '';

    let overdueCount = 0;
    let todayCount = 0;
    let thisWeekCount = 0;
    let myTasksCount = 0;
    const priorityCounts = { alta: 0, media: 0, baja: 0 };

    tasks.forEach(t => {
      const dueMs = toMs(t.dueAt);
      const dueDate = new Date(dueMs);
      if (dueMs < now && t.status !== 'cerrada') overdueCount++;
      if (dueDate.toDateString() === today.toDateString() && t.status !== 'cerrada') todayCount++;
      if (dueDate >= today && dueDate <= weekEnd && t.status !== 'cerrada') thisWeekCount++;
      if (userEmail && (t.responsables?.some(r => r.email === userEmail) || t.responsable === userEmail)) myTasksCount++;
      if (t.priority in priorityCounts) priorityCounts[t.priority]++;
    });

    return { overdueCount, overdueTasksCount: overdueCount, todayCount, thisWeekCount, myTasksCount, priorityCounts };
  }, [tasks, currentUser]);

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
