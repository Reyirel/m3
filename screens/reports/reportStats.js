// screens/reports/reportStats.js
// Cálculos de la pantalla de reportes. Funciones puras: reciben las tareas y devuelven
// los números que se muestran, sin leer ni guardar nada.
import { getAreaType } from '../../config/areas';
import { toMs } from '../../utils/dateUtils';
import { isInProgress } from '../../utils/taskStatus';

const DAY_MS = 24 * 60 * 60 * 1000;

export const PERIOD_DAYS = { week: 7, month: 30, quarter: 90 };

export const EMPTY_PERIOD_STATS = {
  completed: 0,
  inProgress: 0,
  pending: 0,
  overdue: 0,
  completionRate: 0,
  avgCompletionTime: 0,
};

const emptyTypeMetrics = () => ({ total: 0, completed: 0, pending: 0, overdue: 0, avgRate: 0, areas: [] });

export const emptyMetricsByType = () => ({ secretaria: emptyTypeMetrics(), direccion: emptyTypeMetrics() });

const isDone = (task) => task.status === 'cerrada' || task.status === 'completada';

/** Días promedio entre crear y completar una tarea */
export const averageCompletionDays = (completedTasks) => {
  // Solo cuentan las tareas que guardaron cuándo se crearon y cuándo se completaron
  const durations = completedTasks
    .map((task) => ({ start: toMs(task.createdAt), end: toMs(task.completedAt) }))
    .filter(({ start, end }) => start !== null && end !== null && end >= start)
    .map(({ start, end }) => end - start);
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length / DAY_MS);
};

// Vencida: tiene fecha límite, ya pasó y la tarea no se ha terminado
const isOverdueAt = (task, now) => {
  const due = toMs(task.dueAt);
  return due !== null && due < now && !isDone(task);
};

/**
 * Resumen de las tareas creadas en los últimos `days` días.
 * @returns {{ stats: Object, completed: Array }} `completed` son las tareas terminadas del periodo
 */
export const periodStats = (tasks, days, now = Date.now()) => {
  const since = now - days * DAY_MS;
  const inPeriod = tasks.filter((task) => toMs(task.createdAt) >= since);
  const completed = inPeriod.filter(isDone);
  return {
    completed,
    stats: {
      completed: completed.length,
      inProgress: inPeriod.filter((task) => isInProgress(task.status) || task.status === 'en_revision').length,
      pending: inPeriod.filter((task) => task.status === 'pendiente').length,
      overdue: inPeriod.filter((task) => isOverdueAt(task, now)).length,
      completionRate: inPeriod.length > 0 ? Math.round((completed.length / inPeriod.length) * 100) : 0,
      avgCompletionTime: averageCompletionDays(completed),
    },
  };
};

const dayLabel = (date) => date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

/** Tareas completadas en cada uno de los últimos 7 días: [{ date, count }] */
export const dailyCompletions = (completedTasks, today = new Date()) => {
  const byDay = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    byDay[dayLabel(date)] = 0;
  }
  completedTasks.forEach((task) => {
    const label = dayLabel(new Date(toMs(task.completedAt || task.updatedAt)));
    if (label in byDay) byDay[label]++;
  });
  return Object.entries(byDay).map(([date, count]) => ({ date, count }));
};

export const priorityDistribution = (tasks) => ({
  alta: tasks.filter((task) => task.priority === 'alta').length,
  media: tasks.filter((task) => task.priority === 'media').length,
  baja: tasks.filter((task) => task.priority === 'baja').length,
});

/** Métricas por área reducidas a lo que usan las gráficas y la exportación */
export const simpleAreaMetrics = (detailedMetrics) => {
  const byArea = {};
  Object.entries(detailedMetrics).forEach(([area, metrics]) => {
    byArea[area] = {
      completed: metrics.completed,
      total: metrics.total,
      overdue: metrics.overdue,
      userCount: metrics.userCount,
      avgCompletionTime: metrics.avgCompletionTime,
      completionRate: metrics.completionRate || 0,
    };
  });
  return byArea;
};

/**
 * Métricas agrupadas en secretarías y direcciones.
 * @param {Object} detailedMetrics - Métricas por área
 * @param {Array} [firestoreAreas] - Áreas guardadas en Firestore ({ nombre, tipo })
 */
export const metricsByAreaType = (detailedMetrics, firestoreAreas = []) => {
  const byType = emptyMetricsByType();
  const rates = { secretaria: [], direccion: [] };

  Object.entries(detailedMetrics).forEach(([areaName, metrics]) => {
    const firestoreArea = firestoreAreas.find((area) => area.nombre === areaName);
    let tipo = firestoreArea ? firestoreArea.tipo : getAreaType(areaName);
    if (tipo !== 'secretaria' && tipo !== 'direccion') {
      tipo = areaName.toLowerCase().includes('secretaría') ? 'secretaria' : 'direccion';
    }

    byType[tipo].total += metrics.total || 0;
    byType[tipo].completed += metrics.completed || 0;
    byType[tipo].pending += metrics.pending || 0;
    byType[tipo].overdue += metrics.overdue || 0;
    byType[tipo].areas.push({ name: areaName, ...metrics });
    rates[tipo].push(metrics.completionRate || 0);
  });

  ['secretaria', 'direccion'].forEach((tipo) => {
    byType[tipo].avgRate = rates[tipo].length > 0
      ? Math.round(rates[tipo].reduce((a, b) => a + b, 0) / rates[tipo].length)
      : 0;
  });
  return byType;
};

/** Deja solo las áreas elegidas en el filtro (todas si no hay ninguna elegida) */
export const filterMetricsByAreas = ({ detailedAreaMetrics, areaMetrics, areasNeedingAttention }, selectedAreas) => {
  if (selectedAreas.length === 0) return { detailedAreaMetrics, areaMetrics, areasNeedingAttention };
  const pick = (source) => {
    const picked = {};
    selectedAreas.forEach((area) => {
      if (source[area]) picked[area] = source[area];
    });
    return picked;
  };
  return {
    detailedAreaMetrics: pick(detailedAreaMetrics),
    areaMetrics: pick(areaMetrics),
    areasNeedingAttention: areasNeedingAttention.filter((item) => selectedAreas.includes(item.name)),
  };
};
