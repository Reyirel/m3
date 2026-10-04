// services/AreaAlerts.js
// Sistema de alertas automáticas para áreas con problemas
// Optimizado: Solo recalcula cuando hay cambios en tareas


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

