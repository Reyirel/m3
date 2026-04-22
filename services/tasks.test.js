// services/tasks.test.js
// Tests para la capa de servicios de tareas
// Estrategia: testear la lógica pura de filtrado por rol y validación de datos
// extraída inline del servicio, sin depender del onSnapshot en tiempo real.

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('./Logger', () => ({
  debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(),
  perfStart: jest.fn(), perfEnd: jest.fn(),
}));
jest.mock('./authFirestore', () => ({
  getCurrentSession: jest.fn(async () => ({ success: false })),
}));
jest.mock('./emailNotifications', () => ({
  notifyTaskAssigned: jest.fn(async () => {}),
}));
jest.mock('./notifications', () => ({
  notifyAssignment: jest.fn(async () => {}),
}));
jest.mock('./analytics', () => ({
  getGeneralMetrics: jest.fn(async () => ({})),
}));
jest.mock('../utils/dataValidation', () => ({
  validateData: jest.fn(() => ({ valid: true, errors: [] })),
}));
jest.mock('../utils/productionLogger', () => ({
  logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(),
}));
jest.mock('../utils/errorRecovery', () => ({
  withRetry: jest.fn(async (fn) => fn()),
}));
jest.mock('../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(async () => ({ allowed: true })),
}));
jest.mock('./offlineSync', () => ({
  cacheTasksLocally: jest.fn(async () => {}),
  getCachedTasks: jest.fn(async () => []),
  getConnectionState: jest.fn(() => true), // online por defecto
  queueOperation: jest.fn(async () => {}),
  OPERATION_TYPES: { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE' },
}));
jest.mock('../utils/dateUtils', () => ({
  toMs: (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
  },
}));
jest.mock('../utils/taskHelpers', () => ({
  isTaskAssignedToUser: jest.fn((task, email) => {
    if (Array.isArray(task.assignedTo)) {
      return task.assignedTo.some(a => (a.email || a) === email);
    }
    return task.assignedTo === email;
  }),
  normalizeStatus: jest.fn(s => s || 'pendiente'),
}));
jest.mock('../config/areas', () => ({
  getDireccionesBySecretaria: jest.fn(() => []),
  resolveAreaName: jest.fn(a => a || ''),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // retorna unsubscribe fn
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: { fromMillis: jest.fn(ms => ({ seconds: Math.floor(ms / 1000) })) },
  getDoc: jest.fn(),
}));

const { addDoc, collection } = require('firebase/firestore');
const { getCurrentSession } = require('./authFirestore');
const { validateData } = require('../utils/dataValidation');
const { checkRateLimit } = require('../utils/rateLimiter');
const { getConnectionState } = require('./offlineSync');

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const BASE_TASK = {
  title: 'Tarea de prueba',
  description: 'Descripción',
  priority: 'alta',
  area: 'TI',
  assignedTo: ['dev@test.com'],
  dueAt: Date.now() + 86400000,
};

// ─── Helpers de filtrado por rol (lógica extraída del servicio) ───────────────
// Replicamos el filterTasksByRole del servicio para testear sin onSnapshot
const { isTaskAssignedToUser } = require('../utils/taskHelpers');

function buildFilter(userRole, userEmail, allowedAreas = new Set()) {
  return (tasks) => {
    if (userRole === 'admin') return tasks;
    if (userRole === 'secretario') {
      return tasks.filter(task => {
        if (isTaskAssignedToUser(task, userEmail)) return true;
        if ((task.createdBy || '').toLowerCase().trim() === userEmail) return true;
        const taskArea = (task.area || '').toLowerCase().trim();
        return taskArea && allowedAreas.has(taskArea);
      });
    }
    if (userRole === 'director') {
      return tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    }
    return [];
  };
}

const TASKS_FOR_FILTER = [
  { id: '1', title: 'T1', assignedTo: ['director@test.com'], area: 'TI', createdBy: 'admin@test.com' },
  { id: '2', title: 'T2', assignedTo: ['otro@test.com'],     area: 'Legal', createdBy: 'secretario@test.com' },
  { id: '3', title: 'T3', assignedTo: ['secretario@test.com'], area: 'TI', createdBy: 'admin@test.com' },
  { id: '4', title: 'T4', assignedTo: ['nadie@test.com'],    area: 'RRHH', createdBy: 'admin@test.com' },
];

// ─── Tests: filtrado por rol ──────────────────────────────────────────────────
describe('filterTasksByRole — admin', () => {
  test('admin ve todas las tareas', () => {
    const filter = buildFilter('admin', 'admin@test.com');
    expect(filter(TASKS_FOR_FILTER)).toHaveLength(4);
  });
});

describe('filterTasksByRole — director', () => {
  test('director solo ve tareas donde es asignado', () => {
    const filter = buildFilter('director', 'director@test.com');
    const result = filter(TASKS_FOR_FILTER);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('director no ve tareas de otros', () => {
    const filter = buildFilter('director', 'desconocido@test.com');
    expect(filter(TASKS_FOR_FILTER)).toHaveLength(0);
  });
});

describe('filterTasksByRole — secretario', () => {
  test('secretario ve tareas donde es asignado', () => {
    const filter = buildFilter('secretario', 'secretario@test.com', new Set());
    const result = filter(TASKS_FOR_FILTER);
    // T3 tiene assignedTo: ['secretario@test.com']
    expect(result.some(t => t.id === '3')).toBe(true);
  });

  test('secretario ve tareas de su área', () => {
    const filter = buildFilter('secretario', 'sec@test.com', new Set(['ti']));
    const result = filter(TASKS_FOR_FILTER);
    // T1 y T3 son de área TI
    const ids = result.map(t => t.id);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
    expect(ids).not.toContain('2'); // Legal
  });

  test('rol desconocido devuelve lista vacía', () => {
    const filter = buildFilter('invitado', 'x@test.com');
    expect(filter(TASKS_FOR_FILTER)).toHaveLength(0);
  });
});

// ─── Tests: createTask ────────────────────────────────────────────────────────
describe('createTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentSession.mockResolvedValue({
      success: true,
      session: { userId: 'uid1', displayName: 'Test', email: 'user@test.com' },
    });
    getConnectionState.mockReturnValue(true);
    addDoc.mockResolvedValue({ id: 'new-task-id' });
    validateData.mockReturnValue({ valid: true, errors: [] });
    checkRateLimit.mockResolvedValue({ allowed: true });
  });

  test('crea la tarea y retorna el ID cuando está online', async () => {
    const { createTask } = require('./tasks');
    const id = await createTask(BASE_TASK);
    expect(id).toBe('new-task-id');
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  test('lanza error cuando los datos son inválidos', async () => {
    validateData.mockReturnValueOnce({ valid: false, errors: ['El título es requerido'] });

    const { createTask } = require('./tasks');
    await expect(createTask({ ...BASE_TASK, title: '' })).rejects.toThrow('Datos inválidos');
    expect(addDoc).not.toHaveBeenCalled();
  });

  test('lanza error cuando se excede el rate limit', async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, message: 'Too many requests' });

    const { createTask } = require('./tasks');
    await expect(createTask(BASE_TASK)).rejects.toThrow();
    expect(addDoc).not.toHaveBeenCalled();
  });

  test('guarda offline cuando no hay conexión y retorna tempId', async () => {
    getConnectionState.mockReturnValueOnce(false);
    const { queueOperation, cacheTasksLocally } = require('./offlineSync');

    const { createTask } = require('./tasks');
    const id = await createTask(BASE_TASK);

    expect(id).toMatch(/^temp_/);
    expect(addDoc).not.toHaveBeenCalled();
    expect(queueOperation).toHaveBeenCalledTimes(1);
    expect(cacheTasksLocally).toHaveBeenCalledTimes(1);
  });
});
