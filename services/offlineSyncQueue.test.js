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
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    fromMillis: jest.fn(ms => ({ ms })),
    now: jest.fn(() => ({ ms: 0 })),
  },
}));

const { addDoc } = require('firebase/firestore');
const {
  queueOperation,
  getPendingOperations,
  syncPendingOperations,
  cacheTasksLocally,
  getCachedTasks,
  isPermanentError,
  OPERATION_TYPES,
} = require('./offlineSync');

const USER = 'user@test.com';
const errorWithCode = (code) => Object.assign(new Error(code), { code });

describe('cola offline — sincronización', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    jest.clearAllMocks();
  });

  test('un error transitorio conserva la operación y cuenta el reintento', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    addDoc.mockRejectedValueOnce(errorWithCode('unavailable'));

    const result = await syncPendingOperations();

    expect(result.success).toBe(false);
    const pending = await getPendingOperations();
    expect(pending).toHaveLength(1);
    expect(pending[0].retries).toBe(1);
  });

  test('la operación se descarta solo tras agotar los reintentos', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    addDoc.mockRejectedValue(errorWithCode('unavailable'));

    for (let i = 0; i < 4; i++) await syncPendingOperations();
    expect(await getPendingOperations()).toHaveLength(1);

    await syncPendingOperations();
    expect(await getPendingOperations()).toHaveLength(0);
  });

  test('un error permanente descarta la operación de inmediato', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    addDoc.mockRejectedValueOnce(errorWithCode('permission-denied'));

    await syncPendingOperations();

    expect(await getPendingOperations()).toHaveLength(0);
  });

  test('al sincronizar un CREATE la tarea temporal se reemplaza por la real', async () => {
    await cacheTasksLocally([{ id: 'temp_1', title: 'T', isOffline: true }], USER);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'T' }, 'temp_1', USER);
    addDoc.mockResolvedValueOnce({ id: 'real-id' });

    const result = await syncPendingOperations();

    expect(result.synced).toBe(1);
    expect(await getPendingOperations()).toHaveLength(0);
    const cached = await getCachedTasks(USER);
    expect(cached.map(t => t.id)).toEqual(['real-id']);
    expect(cached[0].isOffline).toBe(false);
  });

  test('isPermanentError distingue permisos de fallos de red', () => {
    expect(isPermanentError(errorWithCode('permission-denied'))).toBe(true);
    expect(isPermanentError(errorWithCode('not-found'))).toBe(true);
    expect(isPermanentError(errorWithCode('unavailable'))).toBe(false);
    expect(isPermanentError(new Error('Network request failed'))).toBe(false);
  });
});

describe('cola offline — cambios de otra persona en el mismo dispositivo', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    jest.clearAllMocks();
    addDoc.mockReset();
    addDoc.mockResolvedValue({ id: 'nuevo' });
  });

  test('solo se envían los cambios del usuario con la sesión abierta', async () => {
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'Mía' }, 'temp_1', USER);
    await queueOperation(OPERATION_TYPES.CREATE, { title: 'De otra persona' }, 'temp_2', 'otro@test.com');
    mockStore.userSession = JSON.stringify({ email: 'USER@test.com' });

    const result = await syncPendingOperations();

    expect(result.synced).toBe(1);
    expect(addDoc).toHaveBeenCalledTimes(1);
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
