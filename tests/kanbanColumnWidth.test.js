// tests/kanbanColumnWidth.test.js
// Ancho de las columnas del tablero Kanban según la pantalla.

import { getColumnWidth } from '../screens/kanban/columnWidth';

describe('en web', () => {
  test('pantalla grande: caben las 4 columnas', () => {
    expect(getColumnWidth(1600, true)).toBe((1600 - 32 - 36) / 4);
    expect(getColumnWidth(1200, true)).toBe((1200 - 32 - 36) / 4);
  });

  test('pantalla mediana: 3 columnas; tableta: 2', () => {
    expect(getColumnWidth(1000, true)).toBe((1000 - 32 - 24) / 3);
    expect(getColumnWidth(700, true)).toBe((700 - 32 - 12) / 2);
  });

  test('teléfono: ancho fijo', () => {
    expect(getColumnWidth(500, true)).toBe(280);
    expect(getColumnWidth(360, true)).toBe(260);
  });
});

describe('en la app', () => {
  test('tableta: 2 columnas', () => {
    expect(getColumnWidth(800, false)).toBe((800 - 16 - 12) / 2);
  });

  test('teléfono: una columna casi completa', () => {
    expect(getColumnWidth(600, false)).toBe(600 * 0.85);
    expect(getColumnWidth(390, false)).toBe(390 * 0.88);
  });
});
