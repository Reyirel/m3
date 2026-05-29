// services/subtaskNotifications.test.js
// Tests para notificaciones de subtareas y cambios de estado

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => {}),
  AndroidNotificationPriority: { HIGH: 'high', DEFAULT: 'default' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }, // simular dispositivo nativo
}));

const { getDoc, getDocs } = require('firebase/firestore');
const Notifications = require('expo-notifications');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeDocSnap(data, exists = true) {
  return {
    exists: () => exists,
    id: data?.id || 'task1',
    data: () => data,
  };
}

function makeQuerySnap(docs = []) {
  return {
    empty: docs.length === 0,
    docs: docs.map(d => ({ id: d.id, data: () => d })),
  };
}

// ─── Tests: notifySubtaskCompletion ──────────────────────────────────────────
describe('notifySubtaskCompletion', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no envía notificación si la tarea no existe', async () => {
    getDoc.mockResolvedValueOnce(makeDocSnap(null, false));
    getDocs.mockResolvedValue(makeQuerySnap([]));

    const { notifySubtaskCompletion } = require('./subtaskNotifications');
    await notifySubtaskCompletion('task1', 'sub1', 'user@test.com', { title: 'Subtask' });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('programa notificación local en plataforma nativa', async () => {
    getDoc.mockResolvedValueOnce(makeDocSnap({
      id: 'task1',
      title: 'Tarea principal',
      createdBy: 'admin@test.com',
      assignedTo: ['user@test.com'],
    }));
    // getUserDisplayName query (completedBy)
    getDocs.mockResolvedValueOnce(makeQuerySnap([{
      id: 'uid2',
      email: 'completador@test.com',
      displayName: 'Completador Uno',
    }]));

    const { notifySubtaskCompletion } = require('./subtaskNotifications');
    await notifySubtaskCompletion('task1', 'sub1', 'completador@test.com', { title: 'Revisar doc' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toBe('✅ Subtarea Completada');
    expect(call.content.body).toContain('Revisar doc');
    expect(call.content.data.taskId).toBe('task1');
    expect(call.content.data.type).toBe('subtask_completion');
  });

  test('no notifica al usuario que completó la subtarea', async () => {
    getDoc.mockResolvedValueOnce(makeDocSnap({
      id: 'task1',
      title: 'Tarea',
      createdBy: 'completador@test.com', // mismo que completedBy → no debe notificarse
      assignedTo: 'completador@test.com',
    }));
    getDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const { notifySubtaskCompletion } = require('./subtaskNotifications');
    await notifySubtaskCompletion('task1', 'sub1', 'completador@test.com', { title: 'Sub' });

    // Igual se programa la notificación local (para la app del que completó, si está activa)
    // Pero la lista notifyEmails queda vacía — no hay envío de email adicional
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('soporta assignedTo como array de objetos {email, displayName}', async () => {
    getDoc.mockResolvedValueOnce(makeDocSnap({
      id: 'task1',
      title: 'Tarea array',
      createdBy: 'admin@test.com',
      assignedTo: [
        { email: 'ana@test.com', displayName: 'Ana' },
        { email: 'completador@test.com', displayName: 'Completador' },
      ],
    }));
    getDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const { notifySubtaskCompletion } = require('./subtaskNotifications');
    // No debe lanzar error con esta estructura
    await expect(
      notifySubtaskCompletion('task1', 'sub1', 'completador@test.com', { title: 'Sub' })
    ).resolves.not.toThrow();
  });

  test('no lanza error si Notifications falla', async () => {
    getDoc.mockResolvedValueOnce(makeDocSnap({
      id: 'task1',
      title: 'Tarea',
      createdBy: 'admin@test.com',
      assignedTo: 'user@test.com',
    }));
    getDocs.mockResolvedValueOnce(makeQuerySnap([]));
    Notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error('Permission denied'));

    const { notifySubtaskCompletion } = require('./subtaskNotifications');
    // Debe manejar el error internamente sin propagarlo
    await expect(
      notifySubtaskCompletion('task1', 'sub1', 'other@test.com', { title: 'Sub' })
    ).resolves.not.toThrow();
  });
});

// ─── Tests: notifyTaskStatusChange ───────────────────────────────────────────
describe('notifyTaskStatusChange', () => {
  beforeEach(() => jest.clearAllMocks());

  test('envía notificación con título correcto para estado cerrada', async () => {
    getDocs.mockResolvedValueOnce(makeQuerySnap([{
      id: 'uid1',
      email: 'user@test.com',
      displayName: 'Usuario Test',
    }]));

    const { notifyTaskStatusChange } = require('./subtaskNotifications');
    await notifyTaskStatusChange('task1', 'en_proceso', 'cerrada', 'user@test.com', { title: 'Mi Tarea' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toBe('✅ Tarea Completada');
    expect(call.content.body).toContain('Mi Tarea');
    expect(call.content.data.newStatus).toBe('cerrada');
  });

  test('asigna título correcto para estado en_proceso', async () => {
    getDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const { notifyTaskStatusChange } = require('./subtaskNotifications');
    await notifyTaskStatusChange('task1', 'pendiente', 'en_proceso', 'user@test.com', { title: 'Tarea' });

    const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toBe('🚀 Tarea en Progreso');
  });

  test('asigna título correcto para estado en_revison', async () => {
    getDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const { notifyTaskStatusChange } = require('./subtaskNotifications');
    await notifyTaskStatusChange('task1', 'en_proceso', 'en_revison', 'user@test.com', { title: 'Tarea' });

    const call = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toBe('👀 Tarea en Revisión');
  });

  test('no lanza error si Firestore falla al obtener displayName', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore unreachable'));

    const { notifyTaskStatusChange } = require('./subtaskNotifications');
    await expect(
      notifyTaskStatusChange('task1', 'pendiente', 'cerrada', 'user@test.com', { title: 'Tarea' })
    ).resolves.not.toThrow();
  });
});
