// hooks/useKanbanFilters.test.js
// Filtros, orden y conteos del tablero Kanban

import {
  filterKanbanTasks, isTaskOverdue, kanbanTaskStats, sortKanbanTasks,
} from './useKanbanFilters';

const NO_FILTERS = {
  searchText: '', area: '', responsible: '', priority: '', overdue: false, dueToday: false, dueThisWeek: false,
};

const now = Date.now();
const DAY = 86400000;
const yesterday = now - DAY;
const tomorrow = now + DAY;

// assignedTo es una lista de correos, como la entrega la suscripción de tareas
const TASKS = [
  { id: '1', title: 'Tarea urgente', priority: 'alta', area: 'TI', assignedTo: ['juan@test.com'], dueAt: yesterday, status: 'pendiente', createdAt: now - 1000 },
  { id: '2', title: 'Revision contrato', priority: 'media', area: 'Legal', assignedTo: ['ana@test.com', 'juan@test.com'], dueAt: tomorrow, status: 'en_proceso', createdAt: now - 2000 },
  { id: '3', title: 'Tarea baja prioridad', priority: 'baja', area: 'TI', assignedTo: ['juan@test.com'], dueAt: tomorrow + 10 * DAY, status: 'pendiente', createdAt: now - 3000 },
  { id: '4', title: 'Tarea cerrada', priority: 'alta', area: 'TI', assignedTo: ['juan@test.com'], dueAt: yesterday, status: 'cerrada', createdAt: now - 4000 },
];

const ids = (list) => list.map((task) => task.id);
const filter = (filters) => ids(filterKanbanTasks(TASKS, { ...NO_FILTERS, ...filters }));

describe('filterKanbanTasks', () => {
  test('sin filtros devuelve todas las tareas', () => {
    expect(filter({})).toHaveLength(4);
  });

  test('búsqueda sin distinguir mayúsculas; una tarea sin título no la rompe', () => {
    expect(filter({ searchText: 'URGENTE' })).toEqual(['1']);
    expect(filterKanbanTasks([{ id: 'x' }], { ...NO_FILTERS, searchText: 'algo' })).toEqual([]);
  });

  test('por área y por prioridad', () => {
    expect(filter({ area: 'Legal' })).toEqual(['2']);
    expect(filter({ priority: 'alta' })).toEqual(['1', '4']);
  });

  test('vencidas no incluye las cerradas', () => {
    expect(filter({ overdue: true })).toEqual(['1']);
  });

  test('"Mis tareas" encuentra al usuario entre varios asignados', () => {
    expect(filter({ responsible: 'ana@test.com' })).toEqual(['2']);
    expect(filter({ responsible: 'JUAN@test.com' })).toEqual(['1', '2', '3', '4']);
    // Tareas antiguas guardaban un solo correo
    expect(ids(filterKanbanTasks([{ id: 'v', title: 't', assignedTo: 'ana@test.com' }], { ...NO_FILTERS, responsible: 'ana@test.com' }))).toEqual(['v']);
  });

  test('esta semana: abiertas que vencen en los próximos 7 días', () => {
    expect(filter({ dueThisWeek: true })).toEqual(['2']);
  });
});

describe('sortKanbanTasks', () => {
  test('por fecha: de la más reciente a la más antigua', () => {
    expect(ids(sortKanbanTasks([...TASKS].reverse(), 'date'))).toEqual(['1', '2', '3', '4']);
  });

  test('por prioridad: alta, media, baja y al final las que no tienen', () => {
    const sorted = sortKanbanTasks([{ id: 's' }, ...TASKS], 'priority');
    expect(sorted.map((task) => task.priority)).toEqual(['alta', 'alta', 'media', 'baja', undefined]);
  });
});

describe('kanbanTaskStats', () => {
  test('cuenta vencidas, de la semana, mías y por prioridad', () => {
    expect(kanbanTaskStats(TASKS, 'ana@test.com')).toMatchObject({
      overdueCount: 1,
      thisWeekCount: 1,
      myTasksCount: 1,
      priorityCounts: { alta: 2, media: 1, baja: 1 },
    });
    expect(kanbanTaskStats(TASKS, 'juan@test.com').myTasksCount).toBe(4);
    expect(kanbanTaskStats(TASKS, '').myTasksCount).toBe(0);
  });
});

describe('isTaskOverdue', () => {
  test('vencida y abierta', () => {
    expect(isTaskOverdue({ dueAt: yesterday, status: 'pendiente' })).toBe(true);
  });

  test('cerrada, con fecha futura o sin fecha', () => {
    expect(isTaskOverdue({ dueAt: yesterday, status: 'cerrada' })).toBe(false);
    expect(isTaskOverdue({ dueAt: tomorrow, status: 'pendiente' })).toBe(false);
    expect(isTaskOverdue({ dueAt: null, status: 'pendiente' })).toBe(false);
  });
});
