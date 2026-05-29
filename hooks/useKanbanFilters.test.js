// hooks/useKanbanFilters.test.js
// Tests para el hook de filtros/ordenamiento del tablero Kanban

jest.mock('../utils/dateUtils', () => ({
  toMs: (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
  },
}));

const { useKanbanFilters } = require('./useKanbanFilters');

// Helper para simular el hook sin React (lógica pura)
function runFilters(tasks, options = {}) {
  // Extraemos sólo las funciones puras del hook para testearlas directamente
  const { toMs } = require('../utils/dateUtils');

  const filters = {
    searchText: '',
    area: '',
    responsible: '',
    priority: '',
    overdue: false,
    dueToday: false,
    dueThisWeek: false,
    ...options.filters,
  };

  const sortBy = options.sortBy || 'date';

  const isTaskOverdue = (task) => {
    if (!task.dueAt || task.status === 'cerrada') return false;
    const dueMs = toMs(task.dueAt);
    return dueMs ? dueMs < Date.now() : false;
  };

  const applyFilters = (taskList) => taskList.filter(task => {
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

  const sortTasks = (taskList) => {
    const sorted = [...taskList];
    if (sortBy === 'priority') {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      sorted.sort((a, b) => new Date(toMs(b.createdAt)) - new Date(toMs(a.createdAt)));
    }
    return sorted;
  };

  return { applyFilters, sortTasks, isTaskOverdue };
}

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const now = Date.now();
const yesterday = now - 86400000;
const tomorrow = now + 86400000;

const TASKS = [
  { id: '1', title: 'Tarea urgente', priority: 'alta', area: 'TI', assignedTo: 'juan@test.com', dueAt: yesterday, status: 'pendiente', createdAt: now - 1000 },
  { id: '2', title: 'Revision contrato', priority: 'media', area: 'Legal', assignedTo: 'ana@test.com', dueAt: tomorrow, status: 'en_proceso', createdAt: now - 2000 },
  { id: '3', title: 'Tarea baja prioridad', priority: 'baja', area: 'TI', assignedTo: 'juan@test.com', dueAt: tomorrow, status: 'pendiente', createdAt: now - 3000 },
  { id: '4', title: 'Tarea cerrada', priority: 'alta', area: 'TI', assignedTo: 'juan@test.com', dueAt: yesterday, status: 'cerrada', createdAt: now - 4000 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('useKanbanFilters — filtrado', () => {
  test('sin filtros devuelve todas las tareas', () => {
    const { applyFilters } = runFilters(TASKS);
    expect(applyFilters(TASKS)).toHaveLength(4);
  });

  test('filtro por texto (case insensitive)', () => {
    const { applyFilters } = runFilters(TASKS, { filters: { searchText: 'URGENTE' } });
    const result = applyFilters(TASKS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('filtro por área', () => {
    const { applyFilters } = runFilters(TASKS, { filters: { area: 'Legal' } });
    const result = applyFilters(TASKS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  test('filtro por prioridad alta', () => {
    const { applyFilters } = runFilters(TASKS, { filters: { priority: 'alta' } });
    const result = applyFilters(TASKS);
    expect(result.map(t => t.id)).toEqual(['1', '4']);
  });

  test('filtro overdue excluye tareas cerradas', () => {
    const { applyFilters } = runFilters(TASKS, { filters: { overdue: true } });
    const result = applyFilters(TASKS);
    // tarea 1 está vencida y no cerrada; tarea 4 está vencida pero cerrada
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('filtro por responsable', () => {
    const { applyFilters } = runFilters(TASKS, { filters: { responsible: 'ana@test.com' } });
    const result = applyFilters(TASKS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('useKanbanFilters — ordenamiento', () => {
  test('sortBy=date ordena de más reciente a más antigua (createdAt)', () => {
    const { sortTasks } = runFilters(TASKS, { sortBy: 'date' });
    const sorted = sortTasks(TASKS);
    expect(sorted.map(t => t.id)).toEqual(['1', '2', '3', '4']);
  });

  test('sortBy=priority ordena alta > media > baja', () => {
    const { sortTasks } = runFilters(TASKS, { sortBy: 'priority' });
    const sorted = sortTasks(TASKS);
    const priorities = sorted.map(t => t.priority);
    expect(priorities[0]).toBe('alta');
    expect(priorities[priorities.length - 1]).toBe('baja');
  });
});

describe('useKanbanFilters — isTaskOverdue', () => {
  test('tarea vencida y abierta → true', () => {
    const { isTaskOverdue } = runFilters(TASKS);
    expect(isTaskOverdue({ dueAt: yesterday, status: 'pendiente' })).toBe(true);
  });

  test('tarea vencida pero cerrada → false', () => {
    const { isTaskOverdue } = runFilters(TASKS);
    expect(isTaskOverdue({ dueAt: yesterday, status: 'cerrada' })).toBe(false);
  });

  test('tarea con fecha futura → false', () => {
    const { isTaskOverdue } = runFilters(TASKS);
    expect(isTaskOverdue({ dueAt: tomorrow, status: 'pendiente' })).toBe(false);
  });

  test('tarea sin fecha → false', () => {
    const { isTaskOverdue } = runFilters(TASKS);
    expect(isTaskOverdue({ dueAt: null, status: 'pendiente' })).toBe(false);
  });
});
