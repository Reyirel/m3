// services/AreaAlerts.js
// Alertas automáticas de las áreas con problemas, a partir de sus métricas.

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const taskWord = (count) => (count === 1 ? 'tarea' : 'tareas');

/**
 * Alertas de todas las áreas, de la más grave a la más leve.
 * Cada alerta trae lo que la pantalla necesita para mostrarla:
 *   id          → único (área + tipo), sirve de clave y para descartarla
 *   title       → el nombre del área
 *   description → qué pasa, en una frase
 * @param {Object} areaMetrics - { [área]: { total, overdue, pending, completed } }
 * @returns {Array<{id: string, area: string, type: string, severity: 'critical'|'warning'|'info', title: string, description: string}>}
 */
export function getAreaAlerts(areaMetrics = {}) {
  const alerts = [];
  const add = (area, type, severity, description) => {
    alerts.push({ id: `${area}:${type}`, area, type, severity, title: area, description });
  };

  Object.entries(areaMetrics).forEach(([area, metrics]) => {
    const total = metrics?.total || 0;
    if (total === 0) return;
    const overdue = metrics.overdue || 0;
    const pending = metrics.pending || 0;

    // Vencidas: crítico si pasan de la mitad, advertencia si pasan del 30 %
    const overdueRate = Math.round((overdue / total) * 100);
    if (overdueRate > 30) {
      add(
        area,
        'overdue',
        overdueRate > 50 ? 'critical' : 'warning',
        `${overdueRate}% de sus tareas están vencidas (${overdue} de ${total}).`
      );
    }

    // Sin avance: muchas tareas y ninguna terminada
    if ((metrics.completed || 0) === 0 && total > 5) {
      add(area, 'stalled', 'warning', `Tiene ${total} ${taskWord(total)} y ninguna completada.`);
    }

    // Acumulación: más del 70 % sigue pendiente
    const pendingRate = Math.round((pending / total) * 100);
    if (pendingRate > 70) {
      add(area, 'bottleneck', 'info', `${pendingRate}% de sus tareas sigue pendiente (${pending} de ${total}).`);
    }
  });

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
