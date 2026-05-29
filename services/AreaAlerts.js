// services/AreaAlerts.js
// Sistema de alertas automáticas para áreas con problemas
// Optimizado: Solo recalcula cuando hay cambios en tareas

import { collection, query, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';

/**
 * Monitorear alertas en áreas
 * Retorna alertas cuando:
 * - >30% de tareas vencidas
 * - 0 tareas completadas en 3 días
 * - >50% de tareas en estado "pendiente"
 */
export function subscribeToAreaAlerts(callback) {
  const now = Date.now();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

  // Excluir tareas ya cerradas/completadas (no cambian alertas) y limitar resultados
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('status', 'not-in', ['cerrada', 'cerrado', 'completado']),
    limit(500)
  );

  const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const alerts = [];

    // Agrupar por área
    const areaStats = {};
    tasks.forEach(task => {
      const area = task.area || 'Sin área';
      if (!areaStats[area]) {
        areaStats[area] = {
          total: 0,
          overdue: 0,
          pending: 0,
          completed: 0,
          lastCompletedAt: null,
          completedCount3Days: 0
        };
      }

      areaStats[area].total++;

      // Contar vencidas
      const dueAtMs = toMs(task.dueAt);
      if (dueAtMs && dueAtMs < now && task.status !== 'cerrada') {
        areaStats[area].overdue++;
      }

      // Contar pendientes
      if (task.status === 'pendiente') {
        areaStats[area].pending++;
      }

      // Contar completadas
      if (task.status === 'cerrada') {
        areaStats[area].completed++;
      }

      // Track último completado
      if (task.completedAt && task.completedAt > (areaStats[area].lastCompletedAt || 0)) {
        areaStats[area].lastCompletedAt = task.completedAt;
      }

      // Contar completadas en últimos 3 días
      if (task.completedAt && task.completedAt > threeDaysAgo && task.status === 'cerrada') {
        areaStats[area].completedCount3Days++;
      }
    });

    // Generar alertas
    Object.entries(areaStats).forEach(([area, stats]) => {
      if (stats.total === 0) return;

      const overdueRate = (stats.overdue / stats.total) * 100;
      const pendingRate = (stats.pending / stats.total) * 100;

      // ALERTA 1: Alto porcentaje de vencidas
      if (overdueRate > 30) {
        alerts.push({
          id: `overdue-${area}`,
          area,
          type: 'overdue', // 'overdue' | 'stalled' | 'bottleneck'
          severity: overdueRate > 50 ? 'critical' : 'warning',
          title: `🚨 ${Math.round(overdueRate)}% de tareas vencidas en ${area}`,
          description: `${stats.overdue} de ${stats.total} tareas están vencidas`,
          action: 'Ver tareas vencidas',
          timestamp: Date.now(),
          stats
        });
      }

      // ALERTA 2: Área estancada (sin completadas en 3 días)
      if (stats.completedCount3Days === 0 && stats.total > 0 && !stats.lastCompletedAt) {
        alerts.push({
          id: `stalled-${area}`,
          area,
          type: 'stalled',
          severity: 'warning',
          title: `⏸️ ${area} sin progreso en 3 días`,
          description: 'No hay tareas completadas en los últimos 3 días',
          action: 'Revisar bloqueos',
          timestamp: Date.now(),
          stats
        });
      }

      // ALERTA 3: Demasiadas tareas pendientes
      if (pendingRate > 60) {
        alerts.push({
          id: `pending-${area}`,
          area,
          type: 'bottleneck',
          severity: 'info',
          title: `📋 ${Math.round(pendingRate)}% pendientes en ${area}`,
          description: `${stats.pending} tareas esperando ser iniciadas`,
          action: 'Asignar recursos',
          timestamp: Date.now(),
          stats
        });
      }
    });

    callback(alerts);
  }, (error) => {
    if (__DEV__) console.error('Error suscribiéndose a alertas:', error);
  });

  return unsubscribe;
}

/**
 * Obtener alertas de múltiples áreas
 * Más eficiente que hacer queries por área
 */
export function getAreaAlerts(areaMetrics) {
  const alerts = [];

  Object.entries(areaMetrics).forEach(([area, metrics]) => {
    const total = metrics.total || 0;
    if (total === 0) return;

    // Calificar severidad
    if (metrics.overdue > 0) {
      const overdueRate = (metrics.overdue / total) * 100;
      if (overdueRate > 50) {
        alerts.push({
          area,
          type: 'overdue',
          severity: 'critical',
          message: `🚨 CRÍTICO: ${Math.round(overdueRate)}% vencidas (${metrics.overdue} tareas)`
        });
      } else if (overdueRate > 30) {
        alerts.push({
          area,
          type: 'overdue',
          severity: 'warning',
          message: `⚠️ ADVERTENCIA: ${Math.round(overdueRate)}% vencidas (${metrics.overdue} tareas)`
        });
      }
    }

    // Alertar si >70% pendientes
    if (metrics.pending && metrics.total) {
      const pendingRate = (metrics.pending / total) * 100;
      if (pendingRate > 70) {
        alerts.push({
          area,
          type: 'bottleneck',
          severity: 'info',
          message: `📋 ${Math.round(pendingRate)}% pendientes en ${area}`
        });
      }
    }

    // Alertar si muy pocas completadas
    if (metrics.completed === 0 && total > 5) {
      alerts.push({
        area,
        type: 'stalled',
        severity: 'warning',
        message: `⏸️ ${area}: Sin tareas completadas aún`
      });
    }
  });

  return alerts;
}

/**
 * Detectar áreas que necesitan atención inmediata
 * Retorna ranking de prioridad
 */
export function getAreasForAttention(areaMetrics, threshold = 30) {
  return Object.entries(areaMetrics)
    .map(([area, metrics]) => {
      const overdueRate = metrics.total > 0 ? (metrics.overdue / metrics.total) * 100 : 0;
      const pendingRate = metrics.total > 0 ? (metrics.pending / metrics.total) * 100 : 0;
      
      // Score de urgencia (0-100)
      let score = 0;
      if (overdueRate > threshold) score += Math.min(overdueRate, 100);
      if (pendingRate > 60) score += 20;
      
      return { area, score, overdueRate, pendingRate, metrics };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score);
}
