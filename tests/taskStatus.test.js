// tests/taskStatus.test.js
// Estados de tarea: una sola forma canónica para toda la app

import {
  STATUS,
  normalizeStatus,
  isInProgress,
  isInReview,
  isClosed,
  matchesStatusFilter,
  countByStatus,
  statusLabel,
} from '../utils/taskStatus';

describe('normalizeStatus', () => {
  test('convierte las variantes históricas de "en proceso"', () => {
    ['en_proceso', 'en_progreso', 'en-progreso', 'en progreso', 'EN_PROCESO'].forEach((variant) => {
      expect(normalizeStatus(variant)).toBe(STATUS.IN_PROGRESS);
    });
  });

  test('convierte las variantes de revisión y de cierre', () => {
    expect(normalizeStatus('revision')).toBe(STATUS.IN_REVIEW);
    expect(normalizeStatus('en-revision')).toBe(STATUS.IN_REVIEW);
    ['cerrada', 'cerrado', 'completada', 'completado'].forEach((variant) => {
      expect(normalizeStatus(variant)).toBe(STATUS.CLOSED);
    });
  });

  test('sin estado es pendiente y un valor desconocido se conserva', () => {
    expect(normalizeStatus(undefined)).toBe(STATUS.PENDING);
    expect(normalizeStatus('')).toBe(STATUS.PENDING);
    expect(normalizeStatus('bloqueada')).toBe('bloqueada');
  });
});

describe('predicados', () => {
  test('reconocen cualquier variante', () => {
    expect(isInProgress('en-progreso')).toBe(true);
    expect(isInReview('revision')).toBe(true);
    expect(isClosed('completada')).toBe(true);
    expect(isInProgress('pendiente')).toBe(false);
  });
});

describe('matchesStatusFilter', () => {
  test('"todas" deja pasar cualquier estado', () => {
    expect(matchesStatusFilter('cerrada', 'todas')).toBe(true);
    expect(matchesStatusFilter('pendiente', 'all')).toBe(true);
    expect(matchesStatusFilter('pendiente', undefined)).toBe(true);
  });

  test('compara por estado canónico en ambos lados', () => {
    expect(matchesStatusFilter('en_progreso', 'en_proceso')).toBe(true);
    expect(matchesStatusFilter('en_proceso', 'en-progreso')).toBe(true);
    expect(matchesStatusFilter('en_revision', 'en_proceso')).toBe(false);
  });
});

describe('countByStatus', () => {
  test('cuenta por estado canónico e ignora estados desconocidos', () => {
    const tasks = [
      { status: 'pendiente' },
      { status: 'en_progreso' },
      { status: 'en-progreso' },
      { status: 'revision' },
      { status: 'completada' },
      { status: 'bloqueada' },
      {},
    ];
    expect(countByStatus(tasks)).toEqual({
      pendiente: 2,
      en_proceso: 2,
      en_revision: 1,
      cerrada: 1,
    });
  });
});

describe('statusLabel', () => {
  test('una tarea en proceso no se muestra como pendiente', () => {
    expect(statusLabel('en_proceso')).toBe('En proceso');
    expect(statusLabel('en_progreso')).toBe('En proceso');
    expect(statusLabel('cerrada')).toBe('Cerrada');
  });
});
