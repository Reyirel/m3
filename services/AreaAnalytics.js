// services/AreaAnalytics.js
// Análisis avanzado con histórico, predicciones y detección de cuellos de botella
// Optimizado: Usa caché local para no recalcular constantemente
import { toMs, diffMs } from '../utils/dateUtils';

let analyticsCache = {
  timestamp: 0,
  data: {}
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Calcular comparativa histórica mes a mes
 * @param {Array} allTasks - Todas las tareas
 * @returns {Object} Comparativa por mes
 */
export function calculateMonthlyComparative(allTasks) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const getTaskDate = (t) => {
    if (!t.createdAt) return new Date(0);
    const ms = toMs(t.createdAt);
    return ms !== null ? new Date(ms) : new Date(0);
  };

  const getCurrentMonthTasks = () => 
    allTasks.filter(t => getTaskDate(t) >= currentMonth);
  
  const getLastMonthTasks = () => 
    allTasks.filter(t => {
      const date = getTaskDate(t);
      return date >= lastMonth && date < currentMonth;
    });

  const getTwoMonthsAgoTasks = () =>
    allTasks.filter(t => {
      const date = getTaskDate(t);
      return date >= twoMonthsAgo && date < lastMonth;
    });

  const calculateMetrics = (tasks) => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'cerrada').length,
    completionRate: tasks.length > 0 
      ? Math.round((tasks.filter(t => t.status === 'cerrada').length / tasks.length) * 100)
      : 0,
    avgCompletionDays: calculateAvgCompletionTime(tasks)
  });

  return {
    current: calculateMetrics(getCurrentMonthTasks()),
    previous: calculateMetrics(getLastMonthTasks()),
    twoMonthsAgo: calculateMetrics(getTwoMonthsAgoTasks()),
    trend: calculateTrend(
      calculateMetrics(getTwoMonthsAgoTasks()).completionRate,
      calculateMetrics(getLastMonthTasks()).completionRate,
      calculateMetrics(getCurrentMonthTasks()).completionRate
    )
  };
}

/**
 * Predecir tendencia basada en datos históricos simples
 * Usa regresión lineal simple
 */
export function predictCompletionTrend(areaMetrics, allTasks, area) {
  const areaMetric = areaMetrics[area];
  if (!areaMetric) return null;

  // Obtener últimos 30 días de tareas completadas
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentTasks = allTasks.filter(t => 
    t.area === area && 
    t.completedAt && 
    toMs(t.completedAt) > thirtyDaysAgo
  );

  if (recentTasks.length < 3) return null;

  // Agrupar por semana
  const weeklyData = {};
  recentTasks.forEach(task => {
    const week = Math.floor((Date.now() - toMs(task.completedAt)) / (7 * 24 * 60 * 60 * 1000));
    weeklyData[week] = (weeklyData[week] || 0) + 1;
  });

  const weeks = Object.keys(weeklyData).map(Number).sort((a, b) => a - b);
  const completedCounts = weeks.map(w => weeklyData[w]);

  if (completedCounts.length < 2) return null;

  // Regresión lineal simple: y = mx + b
  const n = completedCounts.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b) / n;
  const meanY = completedCounts.reduce((a, b) => a + b) / n;

  const slope = x.reduce((sum, xi, i) => sum + (xi - meanX) * (completedCounts[i] - meanY), 0) /
                x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);

  const nextWeekPrediction = Math.max(0, Math.round(meanY + slope * n));

  return {
    currentRate: areaMetric.completionRate,
    predictedRate: Math.min(100, nextWeekPrediction),
    trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
    confidence: Math.round((recentTasks.length / (4 * 7)) * 100) // % de datos disponibles
  };
}

/**
 * Detectar cuellos de botella
 * Identifica áreas donde tarda más completar tareas
 */
export function identifyBottlenecks(areaMetrics, allTasks) {
  const bottlenecks = [];

  Object.entries(areaMetrics).forEach(([area, _metrics]) => {
    const areaTasks = allTasks.filter(t => t.area === area);
    const completedTasks = areaTasks.filter(t => t.status === 'cerrada' && t.completedAt && t.createdAt);

    if (completedTasks.length === 0) return;

    // Convertir timestamps Firebase a milisegundos
    const completionTimes = completedTasks.map(t => {
      return diffMs(t.completedAt, t.createdAt);
    });

    // Calcular tiempo promedio
    const avgTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    const avgDays = Math.round(avgTime / (24 * 60 * 60 * 1000));

    // Calcular varianza (dispersión)
    const variance = completionTimes.reduce((sum, time) => {
      const timeDays = time / (24 * 60 * 60 * 1000);
      return sum + Math.pow(timeDays - avgDays, 2);
    }, 0) / completionTimes.length;
    const stdDev = Math.sqrt(variance);

    bottlenecks.push({
      area,
      avgDays,
      stdDev: Math.round(stdDev),
      tasksAnalyzed: completedTasks.length,
      severity: avgDays > 14 ? 'high' : avgDays > 7 ? 'medium' : 'low',
      recommendation: avgDays > 14 
        ? `${area} tarda mucho (${avgDays} días). Considerar más recursos.`
        : stdDev > 5
        ? `${area} tiene inconsistencia (varianza ${Math.round(stdDev)} días). Revisar proceso.`
        : null
    });
  });

  return bottlenecks.sort((a, b) => b.avgDays - a.avgDays);
}

/**
 * Analizar distribución de carga por área
 */
export function analyzeWorkloadDistribution(areaMetrics, allTasks) {
  const totalTasks = allTasks.length || 1;
  const distribution = {};

  Object.entries(areaMetrics).forEach(([area, metrics]) => {
    const percentage = (metrics.total / totalTasks) * 100;
    const completionRate = metrics.completionRate || 0;

    distribution[area] = {
      percentage,
      status: percentage > 30 ? 'overloaded' : percentage > 20 ? 'balanced' : 'light',
      efficiency: completionRate,
      recommendation: percentage > 40
        ? `${area} tiene ${Math.round(percentage)}% de la carga. Redistribuir.`
        : null
    };
  });

  return distribution;
}

/**
 * Sugerencias de optimización por área
 */
export function generateOptimizationSuggestions(areaMetrics, allTasks, alerts) {
  const suggestions = [];

  // Si hay alertas críticas
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    suggestions.push({
      priority: 'critical',
      title: '🚨 Resolver alertas críticas',
      areas: criticalAlerts.map(a => a.area),
      action: 'Aumentar recursos y revisar asignaciones'
    });
  }

  // Si hay cuellos de botella
  const bottlenecks = identifyBottlenecks(areaMetrics, allTasks);
  const slowAreas = bottlenecks.filter(b => b.severity === 'high');
  if (slowAreas.length > 0) {
    suggestions.push({
      priority: 'high',
      title: '⚙️ Optimizar procesos lentos',
      areas: slowAreas.map(b => b.area),
      action: `Mejorar eficiencia: ${slowAreas.map(b => b.recommendation).filter(Boolean)[0]}`
    });
  }

  // Si hay desbalance de carga
  const distribution = analyzeWorkloadDistribution(areaMetrics, allTasks);
  const overloaded = Object.entries(distribution).filter(([_, d]) => d.status === 'overloaded');
  if (overloaded.length > 0) {
    suggestions.push({
      priority: 'medium',
      title: '📊 Rebalancear carga de trabajo',
      areas: overloaded.map(([area]) => area),
      action: 'Redistribuir tareas a áreas con menos trabajo'
    });
  }

  return suggestions;
}

// Helpers privados

function calculateAvgCompletionTime(tasks) {
  const completedTasks = tasks.filter(t => t.status === 'cerrada' && t.completedAt && t.createdAt);
  if (completedTasks.length === 0) return 0;
  
  const totalTime = completedTasks.reduce((sum, t) => {
    return sum + diffMs(t.completedAt, t.createdAt);
  }, 0);
  const avgMs = totalTime / completedTasks.length;
  return Math.round(avgMs / (24 * 60 * 60 * 1000)); // Convertir a días
}

function calculateTrend(old, current, new_) {
  if (current >= new_) return 'improving';
  if (current < new_ && old < current) return 'accelerating';
  return 'declining';
}

/**
 * Cache mejorado para consultas frecuentes
 */
export function getCachedAnalytics(key, computeFn) {
  const now = Date.now();
  
  if (analyticsCache.timestamp + CACHE_DURATION > now && analyticsCache.data[key]) {
    return analyticsCache.data[key];
  }

  const result = computeFn();
  
  analyticsCache.data[key] = result;
  analyticsCache.timestamp = now;
  
  return result;
}

/**
 * Limpiar caché
 */
export function clearAnalyticsCache() {
  analyticsCache = { timestamp: 0, data: {} };
}
