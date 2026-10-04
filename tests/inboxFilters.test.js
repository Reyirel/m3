// tests/inboxFilters.test.js
// Qué tareas aparecen en "Mi bandeja" según el rol, la búsqueda y los filtros.

import {
  EMPTY_FILTERS, filterInboxTasks, hasActiveFilters, isInboxTaskForUser, toggleFilterValue, uniqueTaskAreas,
} from '../screens/inbox/inboxFilters';

const ECONOMIA = 'Secretaría de Desarrollo Económico y Turismo';
const TURISMO = 'Dirección de Turismo';
const CULTURA = 'Dirección de Cultura';
const DAY = 24 * 60 * 60 * 1000;

const tasks = [
  { id: 'turismo', title: 'Feria regional', area: TURISMO, assignedTo: ['tur@m.com'], priority: 'alta', status: 'pendiente', dueAt: Date.now() + 3 * DAY },
  { id: 'cultura', title: 'Festival', description: 'Programa de la feria', area: CULTURA, assignedTo: ['cul@m.com'], priority: 'baja', status: 'en_proceso', dueAt: Date.now() + DAY },
  { id: 'economia', title: 'Padrón de comercios', area: ECONOMIA, assignedTo: [], priority: 'media', status: 'cerrada', dueAt: Date.now() + 2 * DAY },
  { id: 'vencida', title: 'Informe', area: CULTURA, assignedTo: ['tur@m.com'], createdBy: 'eco@m.com', priority: 'alta', status: 'pendiente', dueAt: Date.now() - DAY },
];

const admin = { role: 'admin', email: 'admin@m.com' };
const secretario = { role: 'secretario', email: 'eco@m.com', area: ECONOMIA };
const director = { role: 'director', email: 'tur@m.com', area: TURISMO };

const ids = (list) => list.map((task) => task.id);

describe('a quién le corresponde cada tarea', () => {
  test('sin usuario no se muestra nada', () => {
    expect(filterInboxTasks(tasks, null, '', EMPTY_FILTERS)).toEqual([]);
  });

  test('el admin ve todas, de la que vence primero a la última', () => {
    expect(ids(filterInboxTasks(tasks, admin, '', EMPTY_FILTERS))).toEqual(['vencida', 'cultura', 'economia', 'turismo']);
  });

  test('el secretario ve su secretaría, sus direcciones y las que creó', () => {
    expect(ids(filterInboxTasks(tasks, secretario, '', EMPTY_FILTERS)).sort()).toEqual(['economia', 'turismo', 'vencida']);
    expect(isInboxTaskForUser(tasks[1], secretario)).toBe(false);
  });

  test('el director ve su área y las asignadas a él', () => {
    expect(ids(filterInboxTasks(tasks, director, '', EMPTY_FILTERS)).sort()).toEqual(['turismo', 'vencida']);
  });
});

describe('búsqueda y filtros', () => {
  test('la búsqueda revisa título y descripción', () => {
    expect(ids(filterInboxTasks(tasks, admin, 'FERIA', EMPTY_FILTERS)).sort()).toEqual(['cultura', 'turismo']);
  });

  test('los filtros se combinan', () => {
    const filters = { ...EMPTY_FILTERS, priority: ['alta'], area: [CULTURA] };
    expect(ids(filterInboxTasks(tasks, admin, '', filters))).toEqual(['vencida']);
    expect(ids(filterInboxTasks(tasks, admin, '', { ...EMPTY_FILTERS, status: ['cerrada'] }))).toEqual(['economia']);
    expect(ids(filterInboxTasks(tasks, admin, '', { ...EMPTY_FILTERS, overdue: true }))).toEqual(['vencida']);
  });

  test('toggleFilterValue agrega y quita sin tocar el original', () => {
    const withAlta = toggleFilterValue(EMPTY_FILTERS, 'priority', 'alta');
    expect(withAlta.priority).toEqual(['alta']);
    expect(EMPTY_FILTERS.priority).toEqual([]);
    expect(toggleFilterValue(withAlta, 'priority', 'alta').priority).toEqual([]);
  });

  test('hasActiveFilters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, overdue: true })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, area: [CULTURA] })).toBe(true);
  });

  test('uniqueTaskAreas no repite áreas', () => {
    expect(uniqueTaskAreas(tasks)).toEqual([CULTURA, TURISMO, ECONOMIA].sort());
  });
});
