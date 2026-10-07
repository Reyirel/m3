// services/offlineSyncQueue.test.js
// Tests de la cola offline: reintentos, descarte y reemplazo de tareas temporales

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => (key in mockStore ? mockStore[key] : null)),
  setItem: jest.fn(async (key, value) => { mockStore[key] = value; }),
  removeItem: jest.fn(async (key) => { delete mockStore[key]; }),
  getAllKeys: jest.fn(async () => Object.keys(mockStore)),
  multiRemove: jest.fn(async (keys) => { keys.forEach(k => delete mockStore[k]); }),
}));

const mockCommit = jest.fn(async () => {});
const mockBatchSet = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((_db, _collection, id) => ({ id })),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  writeBatch: jest.fn(() => ({ set: mockBatchSet, update: jest.fn(), commit: mockCommit })),
  serverTimestamp: jest.fn(() => ({ server: true })),
  Timestamp: {
    fromMillis: jest.fn(ms => ({ ms })),
    now: jest.fn(() => ({ ms: 0 })),
  },
}));

const { getDoc } = require('firebase/firestore');
const {
  queueOperation,
  getPendingOperations,
  syncPendingOperations,
  subscribeToDiscardedOperations,
  serverIdForTempTask,
  cacheTasksLocally,
  getCachedTasks,
  isPermanentError,
  OPERATION_TYPES,
} = require('./offlineSync');

const USER = 'user@test.com';
const errorWithCode = (code) => Object.assign(new Error(code), { code });

const resetAll = () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  jest.clearAllMocks();
  mockCommit.mockReset();
  mockCommit.mockResolvedValue(undefined);
  // Por defecto la tarea todavía no existe en el servidor
  getDoc.mockReset();
  getDoc.mockResolvedValue({ exists: () => false });
};

describe('cola offline — sincronización', () => {
  beforeEach(resetAll);

  test('un error transitorio conserva la operación y cuenta el reintento', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    mockCommit.mockRejectedValueOnce(errorWithCode('unavailable'));

    const result = await syncPendingOperations();

    expect(result.success).toBe(false);
    const pending = await getPendingOperations();
    expect(pending).toHaveLength(1);
    expect(pending[0].retries).toBe(1);
  });

  test('la operación se descarta solo tras agotar los reintentos', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    mockCommit.mockRejectedValue(errorWithCode('unavailable'));

    for (let i = 0; i < 4; i++) await syncPendingOperations();
    expect(await getPendingOperations()).toHaveLength(1);

    await syncPendingOperations();
    expect(await getPendingOperations()).toHaveLength(0);
  });

  test('un error permanente descarta la operación de inmediato', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    mockCommit.mockRejectedValueOnce(errorWithCode('permission-denied'));

    await syncPendingOperations();

    expect(await getPendingOperations()).toHaveLength(0);
  });

  test('al sincronizar un CREATE la tarea temporal se reemplaza por la real', async () => {
    await cacheTasksLocally([{ id: 'temp_1', title: 'T', isOffline: true }], USER);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);

    const result = await syncPendingOperations();

    expect(result.synced).toBe(1);
    expect(await getPendingOperations()).toHaveLength(0);
    const cached = await getCachedTasks(USER);
    expect(cached.map(t => t.id)).toEqual([serverIdForTempTask('temp_1')]);
    expect(cached[0].isOffline).toBe(false);
  });

  test('isPermanentError distingue permisos de fallos de red', () => {
    expect(isPermanentError(errorWithCode('permission-denied'))).toBe(true);
    expect(isPermanentError(errorWithCode('not-found'))).toBe(true);
    expect(isPermanentError(errorWithCode('unavailable'))).toBe(false);
    expect(isPermanentError(new Error('Network request failed'))).toBe(false);
  });
});

describe('cola offline — no duplicar ni perder cambios', () => {
  beforeEach(resetAll);

  test('la tarea creada sin conexión usa siempre el mismo ID en el servidor', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_123_abc', USER);

    await syncPendingOperations();

    expect(serverIdForTempTask('temp_123_abc')).toBe('off_123_abc');
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchSet.mock.calls[0][0]).toEqual({ id: 'off_123_abc' });
  });

  test('si un intento anterior ya creó la tarea, no se crea otra vez', async () => {
    await cacheTasksLocally([{ id: 'temp_1', title: 'T', isOffline: true }], USER);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    getDoc.mockResolvedValue({ exists: () => true });

    const result = await syncPendingOperations();

    expect(mockCommit).not.toHaveBeenCalled();
    expect(result.synced).toBe(1);
    expect(await getPendingOperations()).toHaveLength(0);
    expect((await getCachedTasks(USER)).map(t => t.id)).toEqual(['off_1']);
  });

  test('dos sincronizaciones a la vez no envían la misma operación dos veces', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);

    const [first, second] = await Promise.all([syncPendingOperations(), syncPendingOperations()]);

    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(first.synced + second.synced).toBe(1);
  });

  test('cambios encolados al mismo tiempo no se pisan entre sí', async () => {
    await Promise.all([
      queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_proceso' }, 'a', USER),
      queueOperation(OPERATION_TYPES.UPDATE, { status: 'en_revision' }, 'b', USER),
      queueOperation(OPERATION_TYPES.CONFIRM, { email: USER }, 'c', USER),
    ]);

    const pending = await getPendingOperations();
    expect(pending.map(op => op.taskId).sort()).toEqual(['a', 'b', 'c']);
  });

  test('se avisa cuando un cambio se descarta', async () => {
    const onDiscarded = jest.fn();
    const unsubscribe = subscribeToDiscardedOperations(onDiscarded);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    mockCommit.mockRejectedValueOnce(errorWithCode('permission-denied'));

    const result = await syncPendingOperations();
    unsubscribe();

    expect(result.discarded).toBe(1);
    expect(onDiscarded).toHaveBeenCalledWith(1);
  });
});

describe('cola offline — cambios de otra persona en el mismo dispositivo', () => {
  beforeEach(resetAll);

  test('solo se envían los cambios del usuario con la sesión abierta', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'Mía' }, 'temp_1', USER);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'De otra persona' }, 'temp_2', 'otro@test.com');
    mockStore.userSession = JSON.stringify({ email: 'USER@test.com' });

    const result = await syncPendingOperations();

    expect(result.synced).toBe(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    const pending = await getPendingOperations();
    expect(pending).toHaveLength(1);
    expect(pending[0].userEmail).toBe('otro@test.com');
  });

  test('una operación sin autor se envía con cualquier sesión', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'Sin autor' }, 'temp_1');
    mockStore.userSession = JSON.stringify({ email: USER });

    await syncPendingOperations();

    expect(await getPendingOperations()).toHaveLength(0);
  });
});
