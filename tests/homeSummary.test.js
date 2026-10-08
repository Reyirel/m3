// tests/homeSummary.test.js
// Qué muestra Inicio: vencidas, las que vencen hoy, en revisión y próximas.

import { buildHomeSummary, searchTasks } from '../screens/home/homeSummary';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Mediodía, para que "hoy" tenga horas antes y después
const NOW = new Date(2026, 9, 7, 12, 0, 0).getTime();

const TURISMO = 'Dirección de Turismo';
const CULTURA = 'Dirección de Cultura';

const tasks = [
  { id: 'muy-vencida', title: 'Informe anual', area: TURISMO, status: 'pendiente', dueAt: NOW - 10 * DAY },
  { id: 'vencida', title: 'Oficio', area: TURISMO, status: 'en_proceso', dueAt: NOW - HOUR },
  { id: 'hoy', title: 'Entrega de hoy', area: TURISMO, status: 'pendiente', dueAt: NOW + 3 * HOUR },
  { id: 'revision', title: 'Por revisar', area: TURISMO, status: 'en_revision', dueAt: NOW + 2 * DAY, tags: ['feria'] },
  { id: 'lejana', title: 'Plan del año', area: TURISMO, status: 'pendiente', dueAt: NOW + 30 * DAY },
  { id: 'cerrada', title: 'Ya terminada', area: TURISMO, status: 'cerrada', dueAt: NOW - DAY },
  { id: 'sin-fecha', title: 'Sin fecha', area: TURISMO, status: 'pendiente' },
  { id: 'ajena', title: 'De otra área', area: CULTURA, status: 'pendiente', dueAt: NOW - DAY },
];

const admin = { role: 'admin', email: 'admin@m.com' };
const director = { role: 'director', email: 'tur@m.com', area: TURISMO };
const ids = (list) => list.map((task) => task.id);

describe('resumen de Inicio', () => {
  test('agrupa por urgencia y deja fuera las cerradas', () => {
    const summary = buildHomeSummary(tasks, director, NOW);
    expect(ids(summary.overdue)).toEqual(['muy-vencida', 'vencida']);
    expect(ids(summary.today)).toEqual(['hoy']);
    expect(ids(summary.upcoming)).toEqual(['revision']);
    expect(ids(summary.review)).toEqual(['revision']);
    expect(ids(summary.inProgress)).toEqual(['vencida']);
    expect(summary.openCount).toBe(6);
  });

  test('cada quien ve las mismas tareas que en su Bandeja', () => {
    expect(ids(buildHomeSummary(tasks, director, NOW).overdue)).not.toContain('ajena');
    expect(ids(buildHomeSummary(tasks, admin, NOW).overdue)).toContain('ajena');
  });

  test('sin usuario o sin tareas no falla', () => {
    expect(buildHomeSummary(undefined, director, NOW).openCount).toBe(0);
    expect(buildHomeSummary(tasks, null, NOW).openCount).toBe(0);
  });
});

describe('búsqueda de Inicio', () => {
  test('busca en título y etiquetas, solo en las tareas del usuario', () => {
    expect(ids(searchTasks(tasks, director, 'feria'))).toEqual(['revision']);
    expect(ids(searchTasks(tasks, director, 'otra área'))).toEqual([]);
    expect(ids(searchTasks(tasks, admin, 'otra área'))).toEqual(['ajena']);
  });

  test('sin texto no devuelve nada', () => {
    expect(searchTasks(tasks, admin, '  ')).toEqual([]);
  });
});
