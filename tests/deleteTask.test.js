// tests/deleteTask.test.js
// Mandar una tarea a la papelera desde la bandeja también manda sus subtareas por área.
// Antes solo se marcaba la tarea principal y cada área seguía viendo su parte como activa.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../services/Logger', () => ({
  debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(),
  perfStart: jest.fn(), perfEnd: jest.fn(),
}));
jest.mock('../services/authFirestore', () => ({
  getCurrentSession: jest.fn(async () => ({
    success: true,
    session: { email: 'admin@test.com', role: 'admin' },
  })),
}));
jest.mock('../services/analytics', () => ({ getGeneralMetrics: jest.fn(async () => ({})) }));
jest.mock('../services/areaSubtasks', () => ({ updateParentTaskProgress: jest.fn() }));

const mockBatchUpdates = [];
const mockCommit = jest.fn(async () => {});
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ name })),
  doc: jest.fn((_db, _col, id) => ({ id })),
  query: jest.fn((ref, ...filters) => ({ ref, filters })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(async () => {}),
  getDoc: jest.fn(),
  getDocs: jest.fn(async () => ({
    docs: [{ ref: { id: 'sub1' } }, { ref: { id: 'sub2' } }],
  })),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: { now: jest.fn(), fromMillis: jest.fn() },
  writeBatch: jest.fn(() => ({
    update: (ref, data) => mockBatchUpdates.push({ id: ref.id, data }),
    commit: mockCommit,
  })),
}));

const mockConnection = { online: true };
const mockQueued = [];
const mockCache = [
  { id: 'p1', title: 'Principal' },
  { id: 'sub1', parentTaskId: 'p1' },
  { id: 'sub2', parentTaskId: 'p1' },
  { id: 'otra', title: 'Otra' },
];
let mockSavedCache = null;
jest.mock('../services/offlineSync', () => ({
  cacheTasksLocally: jest.fn(async (tasks) => { mockSavedCache = tasks; }),
  getCachedTasks: jest.fn(async () => mockCache),
  getConnectionState: jest.fn(() => mockConnection.online),
  getPendingOperations: jest.fn(async () => []),
  queueOperation: jest.fn(async (type, data, taskId) => { mockQueued.push({ type, data, taskId }); }),
  subscribeToCacheChanges: jest.fn(),
  isPermanentError: jest.fn(() => false),
  isOperationOfUser: jest.fn(() => true),
  OPERATION_TYPES: { UPDATE: 'UPDATE', DELETE: 'DELETE', CONFIRM: 'CONFIRM' },
}));

import { deleteTask } from '../services/tasks';

beforeEach(() => {
  mockBatchUpdates.length = 0;
  mockQueued.length = 0;
  mockSavedCache = null;
  mockCommit.mockClear();
});

test('con conexión, la tarea y sus subtareas van a la papelera en un solo lote', async () => {
  mockConnection.online = true;
  await deleteTask('p1');

  expect(mockCommit).toHaveBeenCalledTimes(1);
  expect(mockBatchUpdates.map((u) => u.id).sort()).toEqual(['p1', 'sub1', 'sub2']);
  mockBatchUpdates.forEach((u) => expect(u.data).toMatchObject({ deleted: true, deletedBy: 'admin@test.com' }));
  expect(mockSavedCache.map((t) => t.id)).toEqual(['otra']);
});

test('sin conexión, la tarea y sus subtareas guardadas se encolan', async () => {
  mockConnection.online = false;
  await deleteTask('p1');

  expect(mockCommit).not.toHaveBeenCalled();
  expect(mockQueued.map((op) => op.taskId)).toEqual(['p1', 'sub1', 'sub2']);
  mockQueued.forEach((op) => expect(op.data).toMatchObject({ deleted: true }));
});
