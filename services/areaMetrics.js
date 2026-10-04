// services/areaMetrics.js
// Servicio mejorado para calcular y gestionar métricas por área

import { toMs } from '../utils/dateUtils';
import { isInProgress } from '../utils/taskStatus';

// No importamos Firebase aquí porque areaMetrics solo calcula datos locales
// Los datos ya vienen de otras funciones que sí usan Firebase

/**
 * Función auxiliar para obtener el área de una tarea
 * Busca primero en task.area, luego en task.areas (plural)
 */
function getTaskArea(task) {
  if (task.area) {
    return task.area;
  } else if (task.areas && Array.isArray(task.areas) && task.areas.length > 0) {
    return task.areas[0];
  }
  return 'Sin Área';
}

/**
 * Calcula métricas detalladas por área
 */
export const calculateDetailedAreaMetrics = (tasks = [], previousTasks = []) => {
  const byArea = {};
  const prevByArea = {};

  // Procesar tareas actuales
  tasks.forEach((task) => {
    const area = getTaskArea(task);
    if (!byArea[area]) {
      byArea[area] = {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        users: new Set(),
        avgCompletionTime: 0,
        completionTimes: [],
      };
    }

    byArea[area].total++;
    byArea[area].users.add(task.assignedTo || 'Sin asignar');

    // Contar por estado
    const status = task.status?.toLowerCase() || 'pendiente';
    if (status === 'cerrada' || status === 'completada') {
      byArea[area].completed++;
      
      // Calcular tiempo de completación
      if (task.createdAt && task.completedAt) {
        const createdTime = toMs(task.createdAt);
        const completedTime = toMs(task.completedAt);
        const timeMs = completedTime - createdTime;
        const timeDays = Math.ceil(timeMs / (1000 * 60 * 60 * 24));
        byArea[area].completionTimes.push(timeDays);
      }
    } else if (status === 'pendiente') {
      byArea[area].pending++;
    } else if (isInProgress(status)) {
      byArea[area].inProgress++;
    }

    // Contar tareas atrasadas
    if (task.dueAt) {
      const dueDate = toMs(task.dueAt);
      const now = Date.now();
      if (dueDate < now && (status !== 'cerrada' && status !== 'completada')) {
        byArea[area].overdue++;
      }
    }
  });

  // Procesar tareas anteriores para calcular tendencias
  previousTasks.forEach((task) => {
    const area = getTaskArea(task);
    if (!prevByArea[area]) {
      prevByArea[area] = { completed: 0, total: 0 };
    }
    prevByArea[area].total++;
    if (task.status === 'cerrada' || task.status === 'completada') {
      prevByArea[area].completed++;
    }
  });

  // Calcular promedios y convertir Sets a arrays
  Object.keys(byArea).forEach((area) => {
    const metrics = byArea[area];
    
    // Convertir Set de usuarios a conteo
    metrics.userCount = metrics.users.size;
    delete metrics.users;

    // Calcular tiempo promedio de completación
    if (metrics.completionTimes.length > 0) {
      const avgTime = Math.round(
        metrics.completionTimes.reduce((a, b) => a + b, 0) /
          metrics.completionTimes.length
      );
      metrics.avgCompletionTime = avgTime;
    }
    delete metrics.completionTimes;

    // Calcular tendencia comparando períodos
    const prevRate = prevByArea[area]
      ? Math.round((prevByArea[area].completed / prevByArea[area].total) * 100)
      : 0;
    const currentRate = metrics.total > 0 
      ? Math.round((metrics.completed / metrics.total) * 100)
      : 0;
    
    metrics.completionRate = currentRate;
    metrics.trend = currentRate - prevRate;
    metrics.trendDirection = currentRate > prevRate ? 'up' : currentRate < prevRate ? 'down' : 'stable';
  });

  return byArea;
};

/**
 * Obtiene áreas que necesitan atención (bajo rendimiento)
 */
export const getAreasNeedingAttention = (areaMetrics, threshold = 50) => {
  return Object.entries(areaMetrics)
    .filter(([_, metrics]) => metrics.completionRate < threshold)
    .map(([name, metrics]) => ({ name, ...metrics }))
    .sort((a, b) => a.completionRate - b.completionRate);
};

/**
 * Genera resumen ejecutivo de áreas
 */
export const generateAreaSummary = (areaMetrics, tasks) => {
  const areas = Object.keys(areaMetrics);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => 
    t.status === 'cerrada' || t.status === 'completada'
  ).length;

  const totalAverageTimes = [];
  Object.values(areaMetrics).forEach((area) => {
    if (area.avgCompletionTime > 0) {
      totalAverageTimes.push(area.avgCompletionTime);
    }
  });

  return {
    totalAreas: areas.length,
    completionRateAverage: Math.round(
      Object.values(areaMetrics).reduce((sum, m) => sum + m.completionRate, 0) /
        areas.length
    ),
    totalTasks,
    completedTasks,
    overallRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    avgCompletionTime: 
      totalAverageTimes.length > 0
        ? Math.round(
            totalAverageTimes.reduce((a, b) => a + b, 0) / totalAverageTimes.length
          )
        : 0,
  };
};
