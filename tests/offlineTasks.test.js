// tests/offlineTasks.test.js
// Trabajo sin conexión: la lista muestra los cambios pendientes de la cola y la cola
// no pierde cambios al combinar operaciones ni al cerrar sesión.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../services/Logger', () => ({
  debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(),
  perfStart: jest.fn(), perfEnd: jest.fn(),
}));
jest.mock('../services/authFirestore', () => ({
  getCurrentSession: jest.fn(async () => ({ success: false })),
}));
jest.mock('../services/notifications', () => ({ notifyAssignment: jest.fn(async () => {}) }));
jest.mock('../services/analytics', () => ({ getGeneralMetrics: jest.fn(async () => ({})) }));

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => (mockStorage.has(key) ? mockStorage.get(key) : null)),
  setItem: jest.fn(async (key, value) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key) => { mockStorage.delete(key); }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
  multiRemove: jest.fn(async (keys) => { keys.forEach((key) => mockStorage.delete(key)); }),
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true })),
}));

import { applyPendingOperations } from '../services/tasks';
import {
  queueOperation,
  getPendingOperations,
  clearOfflineData,
  cacheTasksLocally,
  getCachedTasks,
  OPERATION_TYPES,
} from '../services/offlineSync';

const TASKS = [
  { id: 'a', title: 'A', status: 'pendiente', assignedTo: ['uno@test.com', 'dos@test.com'], completedBy: [] },
  { id: 'b', title: 'B', status: 'en_proceso', assignedTo: ['uno@test.com'] },
];

describe('applyPendingOperations', () => {
  test('sin operaciones devuelve la misma lista', () => {
    expect(applyPendingOperations(TASKS, [])).toBe(TASKS);
  });

  test('un cambio de estado pendiente se ve en la lista', () => {
    const ops = [{ type: OPERATION_TYPES.UPDATE, taskId: 'a', data: { status: 'en_proceso' }, timestamp: 1 }];
    const result = applyPendingOperations(TASKS, ops);
    expect(result.find(t => t.id === 'a')).toMatchObject({ status: 'en_proceso', pendingSync: true });
    expect(result.find(t => t.id === 'b').pendingSync).toBeUndefined();
  });

  test('una tarea enviada a la papelera sin conexión desaparece de la lista', () => {
    const ops = [{ type: OPERATION_TYPES.UPDATE, taskId: 'b', data: { deleted: true }, timestamp: 1 }];
    expect(applyPendingOperations(TASKS, ops).map(t => t.id)).toEqual(['a']);
  });

  test('una confirmación pendiente aparece una sola vez', () => {
    const op = { type: OPERATION_TYPES.CONFIRM, taskId: 'a', data: { email: 'Uno@test.com' }, timestamp: 5 };
    const result = applyPendingOperations(TASKS, [op, { ...op, timestamp: 6 }]);
    const completedBy = result.find(t => t.id === 'a').completedBy;
    expect(completedBy).toHaveLength(1);
    expect(completedBy[0]).toMatchObject({ email: 'uno@test.com', pendingSync: true });
  });

  test('las operaciones se aplican en orden cronológico', () => {
    const ops = [
      { type: OPERATION_TYPES.UPDATE, taskId: 'a', data: { status: 'en_revision' }, timestamp: 20 },
      { type: OPERATION_TYPES.UPDATE, taskId: 'a', data: { status: 'en_proceso' }, timestamp: 10 },
    ];
    expect(applyPendingOperations(TASKS, ops).find(t => t.id === 'a').status).toBe('en_revision');
  });
});

describe('cola sin conexión', () => {
  beforeEach(() => mockStorage.clear());

  test('dos cambios a la misma tarea se combinan sin perder campos', async () => {
    await queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_proceso' }, 'a', 'uno@test.com');
    await queueOperation(OPERATION_TYPES.UPDATE, { priority: 'alta' }, 'a', 'uno@test.com');

    const ops = await getPendingOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].data).toEqual({ status: 'en_proceso', priority: 'alta' });
  });

  test('el campo más reciente gana al combinar', async () => {
    await queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_proceso' }, 'a', 'uno@test.com');
    await queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_revision' }, 'a', 'uno@test.com');

    const ops = await getPendingOperations();
    expect(ops[0].data.status).toBe('en_revision');
  });

  test('cerrar sesión borra la copia de tareas pero conserva los cambios sin enviar', async () => {
    await cacheTasksLocally(TASKS, 'uno@test.com');
    await queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_proceso' }, 'a', 'uno@test.com');

    await clearOfflineData();

    expect(await getCachedTasks('uno@test.com')).toEqual([]);
    expect(await getPendingOperations()).toHaveLength(1);
  });
});
