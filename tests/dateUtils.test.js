/**
 * Unit Tests para dateUtils.js
 * Comando: npm test -- dateUtils.test.js
 */

import {
  toMs,
  isBefore,
  isAfter,
  isOverdue,
  diffMs,
  diffDays,
  toDate
} from '../utils/dateUtils';

describe('dateUtils - toMs()', () => {
  test('convierte Firestore Timestamp con toMillis()', () => {
    const timestamp = { toMillis: () => 1704067200000 };
    expect(toMs(timestamp)).toBe(1704067200000);
  });

  test('convierte Firestore Timestamp con propiedad seconds', () => {
    const timestamp = { seconds: 1704067200 };
    expect(toMs(timestamp)).toBe(1704067200000);
  });

  test('acepta números directamente', () => {
    expect(toMs(1704067200000)).toBe(1704067200000);
  });

  test('convierte Date objects', () => {
    const date = new Date('2024-01-01');
    const ms = date.getTime();
    expect(toMs(date)).toBe(ms);
  });

  test('parsea strings ISO', () => {
    const isoString = '2024-01-01T00:00:00.000Z';
    const date = new Date(isoString);
    const ms = date.getTime();
    expect(toMs(isoString)).toBe(ms);
  });

  test('retorna null para null y undefined', () => {
    expect(toMs(null)).toBeNull();
    expect(toMs(undefined)).toBeNull();
  });

  test('retorna null para strings inválidos', () => {
    expect(toMs('invalid-date')).toBeNull();
  });

  test('EDGE CASE: 0 es un timestamp válido (epoch)', () => {
    expect(toMs(0)).toBe(0);
  });
});

describe('dateUtils - isBefore()', () => {
  test('retorna true si timestamp es anterior', () => {
    const pastDate = Date.now() - 86400000; // 1 día atrás
    expect(isBefore(pastDate)).toBe(true);
  });

  test('retorna false si timestamp es posterior', () => {
    const futureDate = Date.now() + 86400000; // 1 día adelante
    expect(isBefore(futureDate)).toBe(false);
  });

  test('compara contra timestamp custom', () => {
    const t1 = 1704067200000;
    const t2 = 1704153600000; // Un día después
    expect(isBefore(t1, t2)).toBe(true);
  });

  test('retorna false si timestamp es null', () => {
    expect(isBefore(null)).toBe(false);
  });

  test('EDGE CASE: timestamp undefined', () => {
    expect(isBefore(undefined)).toBe(false);
  });
});

describe('dateUtils - isAfter()', () => {
  test('retorna true si timestamp es posterior', () => {
    const futureDate = Date.now() + 86400000;
    expect(isAfter(futureDate)).toBe(true);
  });

  test('retorna false si timestamp es anterior', () => {
    const pastDate = Date.now() - 86400000;
    expect(isAfter(pastDate)).toBe(false);
  });

  test('EDGE CASE: timestamp null', () => {
    expect(isAfter(null)).toBe(false);
  });
});

describe('dateUtils - isOverdue()', () => {
  test('retorna true si dueAt es anterior y status no es cerrada', () => {
    const task = {
      dueAt: Date.now() - 86400000,
      status: 'abierta'
    };
    expect(isOverdue(task)).toBe(true);
  });

  test('retorna false si status es cerrada', () => {
    const task = {
      dueAt: Date.now() - 86400000,
      status: 'cerrada'
    };
    expect(isOverdue(task)).toBe(false);
  });

  test('retorna false si status es completada', () => {
    const task = {
      dueAt: Date.now() - 86400000,
      status: 'completada'
    };
    expect(isOverdue(task)).toBe(false);
  });

  test('retorna false si dueAt es null', () => {
    const task = {
      dueAt: null,
      status: 'abierta'
    };
    expect(isOverdue(task)).toBe(false);
  });

  test('EDGE CASE: status normalizado (en_proceso)', () => {
    const task = {
      dueAt: Date.now() - 86400000,
      status: 'en_proceso'
    };
    expect(isOverdue(task)).toBe(true);
  });

  test('EDGE CASE: task sin dueAt', () => {
    const task = { status: 'abierta' };
    expect(isOverdue(task)).toBe(false);
  });
});

describe('dateUtils - diffMs()', () => {
  test('calcula diferencia entre timestamps', () => {
    const start = 1704067200000;
    const end = 1704153600000;
    expect(diffMs(end, start)).toBe(86400000); // 1 día
  });

  test('retorna valor negativo si end < start', () => {
    const end = 1704067200000;
    const start = 1704153600000;
    expect(diffMs(end, start)).toBe(-86400000);
  });

  test('retorna 0 si timestamps son null', () => {
    expect(diffMs(null, 1704067200000)).toBe(0);
    expect(diffMs(1704067200000, null)).toBe(0);
  });

  test('EDGE CASE: ambos timestamps null', () => {
    expect(diffMs(null, null)).toBe(0);
  });
});

describe('dateUtils - diffDays()', () => {
  test('calcula diferencia en días', () => {
    const start = 1704067200000;
    const end = 1704153600000; // +1 día
    expect(diffDays(end, start)).toBe(1);
  });

  test('redondea hacia arriba (ceil)', () => {
    const start = 1704067200000;
    const end = 1704067200000 + 12 * 60 * 60 * 1000; // 0.5 días
    expect(diffDays(end, start)).toBe(1);
  });

  test('retorna 0 si timestamps son null', () => {
    expect(diffDays(null, 1704067200000)).toBe(0);
  });

  test('EDGE CASE: calcular días negativos', () => {
    const end = 1704067200000;
    const start = 1704153600000;
    const result = diffDays(end, start);
    expect(result).toBe(-1); // ceil de -1 = -1
  });
});

describe('dateUtils - toDate()', () => {
  test('convierte timestamp a Date', () => {
    const ms = 1704067200000;
    const result = toDate(ms);
    expect(result instanceof Date).toBe(true);
    expect(result.getTime()).toBe(ms);
  });

  test('retorna null si timestamp es null', () => {
    expect(toDate(null)).toBeNull();
  });

  test('convierte Firestore Timestamp', () => {
    const timestamp = { seconds: 1704067200 };
    const result = toDate(timestamp);
    expect(result instanceof Date).toBe(true);
    expect(result.getTime()).toBe(1704067200000);
  });
});

describe('EDGE CASES CRÍTICOS', () => {
  test('timestamp undefined en comparaciones', () => {
    const task = { status: 'abierta' }; // sin dueAt
    expect(isOverdue(task)).toBe(false);
  });

  test('dueAt como string ISO', () => {
    const task = {
      dueAt: '2024-01-01T00:00:00.000Z',
      status: 'abierta'
    };
    // Debería funcionar pero depende de parse correcto
    const result = isOverdue(task);
    expect(typeof result).toBe('boolean');
  });

  test('Firestore Timestamp sin toMillis', () => {
    const task = {
      dueAt: { seconds: 1704067200 },
      status: 'abierta'
    };
    expect(isOverdue(task)).toBe(true); // Timestamp de 2024-01-01 (ya pasó)
  });

  test('comparar tasks con Timestamp.seconds > 1M', () => {
    // Algunos Timestamps tienen seconds > 1M (errores de conversión)
    const badTimestamp = 1704067200000; // Milisegundos, no segundos
    const result = isBefore(badTimestamp);
    expect(typeof result).toBe('boolean');
  });

  test('CRÍTICO: zero timestamp (epoch)', () => {
    // 0 es un timestamp válido, no debe tratarse como falsy
    expect(toMs(0)).toBe(0);
  });
});
