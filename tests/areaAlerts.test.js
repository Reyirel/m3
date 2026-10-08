// tests/areaAlerts.test.js
// Alertas de Reportes: cada una debe traer lo que la pantalla muestra (id, título y
// descripción). Antes solo traían `message` y las tarjetas salían vacías.

import { getAreaAlerts } from '../services/AreaAlerts';

const metrics = {
  Turismo: { total: 10, overdue: 6, pending: 8, completed: 0 },
  Cultura: { total: 10, overdue: 4, pending: 2, completed: 5 },
  Obras: { total: 4, overdue: 0, pending: 1, completed: 3 },
  Vacía: { total: 0 },
};

describe('alertas de las áreas', () => {
  const alerts = getAreaAlerts(metrics);

  test('cada alerta tiene id único, título y descripción', () => {
    alerts.forEach((alert) => {
      expect(alert.title).toBeTruthy();
      expect(alert.description).toBeTruthy();
    });
    expect(new Set(alerts.map((alert) => alert.id)).size).toBe(alerts.length);
  });

  test('clasifica por porcentaje de vencidas y ordena de la más grave a la más leve', () => {
    expect(alerts.map((alert) => `${alert.area}:${alert.type}:${alert.severity}`)).toEqual([
      'Turismo:overdue:critical',
      'Turismo:stalled:warning',
      'Cultura:overdue:warning',
      'Turismo:bottleneck:info',
    ]);
    expect(alerts[0].description).toBe('60% de sus tareas están vencidas (6 de 10).');
  });

  test('las áreas sin problemas o sin tareas no generan alertas', () => {
    expect(alerts.some((alert) => alert.area === 'Obras' || alert.area === 'Vacía')).toBe(false);
    expect(getAreaAlerts()).toEqual([]);
  });
});
