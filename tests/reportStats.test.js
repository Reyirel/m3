// tests/reportStats.test.js
// Cálculos de la pantalla de reportes.

import {
  averageCompletionDays, dailyCompletions, filterMetricsByAreas, metricsByAreaType,
  periodStats, priorityDistribution, simpleAreaMetrics,
} from '../screens/reports/reportStats';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 4, 12).getTime();
const daysAgo = (days) => NOW - days * DAY;

describe('periodStats', () => {
  const tasks = [
    { id: 'a', status: 'cerrada', createdAt: daysAgo(3), completedAt: daysAgo(1), dueAt: daysAgo(2) },
    { id: 'b', status: 'completada', createdAt: daysAgo(5), completedAt: daysAgo(1), dueAt: NOW + DAY },
    { id: 'c', status: 'pendiente', createdAt: daysAgo(2), dueAt: daysAgo(1) },
    { id: 'd', status: 'en_revision', createdAt: daysAgo(6), dueAt: NOW + DAY },
    { id: 'e', status: 'pendiente', createdAt: daysAgo(20), dueAt: NOW + DAY },
  ];

  test('cuenta solo las tareas creadas dentro del periodo', () => {
    const { stats, completed } = periodStats(tasks, 7, NOW);
    expect(completed.map((task) => task.id)).toEqual(['a', 'b']);
    expect(stats).toEqual({
      completed: 2,
      inProgress: 1,
      pending: 1,
      overdue: 1,
      completionRate: 50,
      avgCompletionTime: 3,
    });
  });

  test('un periodo más largo incluye las tareas anteriores', () => {
    const { stats } = periodStats(tasks, 30, NOW);
    expect(stats.pending).toBe(2);
    expect(stats.completionRate).toBe(40);
  });

  test('una tarea sin fecha límite o ya terminada no cuenta como vencida', () => {
    const { stats } = periodStats([
      { status: 'pendiente', createdAt: daysAgo(1) },
      { status: 'completada', createdAt: daysAgo(4), completedAt: daysAgo(1), dueAt: daysAgo(2) },
      { status: 'cerrada', createdAt: daysAgo(4), dueAt: daysAgo(2) },
    ], 7, NOW);
    expect(stats.overdue).toBe(0);
  });

  test('el tiempo promedio ignora las tareas sin fecha de término', () => {
    expect(averageCompletionDays([
      { createdAt: daysAgo(5), completedAt: daysAgo(1) },
      { createdAt: daysAgo(5) },
    ])).toBe(4);
    expect(averageCompletionDays([{ createdAt: daysAgo(5) }])).toBe(0);
  });

  test('sin tareas todo queda en cero', () => {
    expect(periodStats([], 7, NOW).stats).toEqual({
      completed: 0, inProgress: 0, pending: 0, overdue: 0, completionRate: 0, avgCompletionTime: 0,
    });
    expect(averageCompletionDays([])).toBe(0);
  });
});

describe('dailyCompletions', () => {
  test('devuelve los últimos 7 días y cuenta por fecha de término', () => {
    const today = new Date(NOW);
    const days = dailyCompletions([
      { completedAt: NOW },
      { completedAt: daysAgo(1) },
      { updatedAt: daysAgo(1) },
      { completedAt: daysAgo(15) },
    ], today);

    expect(days).toHaveLength(7);
    expect(days[6].count).toBe(1);
    expect(days[5].count).toBe(2);
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });
});

test('priorityDistribution cuenta por prioridad', () => {
  expect(priorityDistribution([{ priority: 'alta' }, { priority: 'alta' }, { priority: 'baja' }, {}]))
    .toEqual({ alta: 2, media: 0, baja: 1 });
});

describe('métricas por área', () => {
  const detailed = {
    'Secretaría de Bienestar Social': { total: 10, completed: 8, pending: 2, overdue: 1, completionRate: 80, userCount: 3 },
    'Dirección de Turismo': { total: 4, completed: 1, pending: 3, overdue: 0, completionRate: 25 },
    'Dirección de Cultura': { total: 6, completed: 3, pending: 3, overdue: 2, completionRate: 50 },
    'Área nueva': { total: 1, completed: 1, pending: 0, overdue: 0, completionRate: 100 },
  };

  test('simpleAreaMetrics conserva los campos que usan las gráficas', () => {
    expect(simpleAreaMetrics(detailed)['Dirección de Turismo']).toEqual({
      completed: 1, total: 4, overdue: 0, userCount: undefined, avgCompletionTime: undefined, completionRate: 25,
    });
  });

  test('agrupa en secretarías y direcciones y promedia el cumplimiento', () => {
    const byType = metricsByAreaType(detailed);
    expect(byType.secretaria).toMatchObject({ total: 10, completed: 8, pending: 2, overdue: 1, avgRate: 80 });
    expect(byType.secretaria.areas.map((area) => area.name)).toEqual(['Secretaría de Bienestar Social']);
    // Un área que no está en el organigrama cuenta como dirección
    expect(byType.direccion).toMatchObject({ total: 11, completed: 5, overdue: 2, avgRate: 58 });
    expect(byType.direccion.areas).toHaveLength(3);
  });

  test('el tipo guardado en Firestore manda sobre el del organigrama', () => {
    const byType = metricsByAreaType(detailed, [{ nombre: 'Área nueva', tipo: 'secretaria' }]);
    expect(byType.secretaria.areas.map((area) => area.name)).toContain('Área nueva');
    expect(byType.secretaria.avgRate).toBe(90);
  });

  test('filterMetricsByAreas deja solo las áreas elegidas', () => {
    const all = {
      detailedAreaMetrics: detailed,
      areaMetrics: simpleAreaMetrics(detailed),
      areasNeedingAttention: [{ name: 'Dirección de Turismo' }, { name: 'Dirección de Cultura' }],
    };
    expect(filterMetricsByAreas(all, [])).toEqual(all);

    const filtered = filterMetricsByAreas(all, ['Dirección de Turismo', 'No existe']);
    expect(Object.keys(filtered.detailedAreaMetrics)).toEqual(['Dirección de Turismo']);
    expect(Object.keys(filtered.areaMetrics)).toEqual(['Dirección de Turismo']);
    expect(filtered.areasNeedingAttention).toEqual([{ name: 'Dirección de Turismo' }]);
  });
});
