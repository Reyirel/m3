// services/areaMetrics.js
// Servicio mejorado para calcular y gestionar métricas por área

import { toMs } from '../utils/dateUtils';

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
    } else if (status === 'en progreso' || status === 'en_progreso' || status === 'en-progreso') {
      byArea[area].inProgress++;
    }

    // Contar tareas atrasadas
    if (task.dueDate) {
      const dueDate = toMs(task.dueDate);
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
 * Recupera tareas de un período anterior (semana anterior, mes anterior, etc.)
 */
export const getPreviousPeriodicTasks = async (tasks, periodDays) => {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;
  const periodEnd = now - (periodDays - 7) * 24 * 60 * 60 * 1000; // Una semana antes

  return tasks.filter((task) => {
    const taskDate = toMs(task.createdAt);
    return taskDate >= periodStart && taskDate <= periodEnd;
  });
};

/**
 * Obtiene área con mejor desempeño
 */
export const getTopPerformingArea = (areaMetrics) => {
  let topArea = null;
  let topRate = -1;

  Object.entries(areaMetrics).forEach(([name, metrics]) => {
    if (metrics.completionRate > topRate) {
      topRate = metrics.completionRate;
      topArea = { name, ...metrics };
    }
  });

  return topArea;
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
 * Calcula distribución de tareas por estado en un área
 */
export const getAreaTaskDistribution = (tasks, areaName) => {
  const filtered = tasks.filter((task) => getTaskArea(task) === areaName);
  
  const distribution = {
    completed: 0,
    pending: 0,
    inProgress: 0,
    overdue: 0,
  };

  filtered.forEach((task) => {
    const status = task.status?.toLowerCase() || 'pendiente';
    if (status === 'cerrada' || status === 'completada') {
      distribution.completed++;
    } else if (status === 'pendiente') {
      distribution.pending++;
    } else if (status === 'en progreso' || status === 'en_progreso' || status === 'en-progreso') {
      distribution.inProgress++;
    }

    if (task.dueDate) {
      const dueDate = toMs(task.dueDate);
      if (dueDate < Date.now() && (status !== 'cerrada' && status !== 'completada')) {
        distribution.overdue++;
      }
    }
  });

  return distribution;
};

/**
 * Obtiene usuarios asignados a un área
 */
export const getAreaUsers = (tasks, areaName) => {
  const filtered = tasks.filter((task) => getTaskArea(task) === areaName);
  const users = new Set();

  filtered.forEach((task) => {
    if (task.assignedTo) {
      users.add(task.assignedTo);
    }
    if (Array.isArray(task.assignedUsers)) {
      task.assignedUsers.forEach(u => users.add(u));
    }
  });

  return Array.from(users);
};

/**
 * Compara rendimiento de dos períodos
 */
export const compareAreaPerformance = (currentMetrics, previousMetrics) => {
  const comparison = {};

  Object.keys(currentMetrics).forEach((area) => {
    const current = currentMetrics[area];
    const previous = previousMetrics[area] || { total: 0, completed: 0 };

    const prevRate = previous.total > 0 
      ? (previous.completed / previous.total) * 100 
      : 0;
    const currentRate = current.total > 0 
      ? (current.completed / current.total) * 100 
      : 0;

    comparison[area] = {
      currentRate: Math.round(currentRate),
      previousRate: Math.round(prevRate),
      change: Math.round(currentRate - prevRate),
      tasksCompleted: current.completed,
      totalTasks: current.total,
      newTasks: current.total - (previous.total || 0),
    };
  });

  return comparison;
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
