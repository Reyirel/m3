// tests/chatAndReports.test.js
// Chat: a quién se avisa y qué cuenta como no leído.
// Reportes pendientes: reintentos sin duplicar y sin perder fotos.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(async () => ({ id: 'n1' })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => (mockStorage.has(key) ? mockStorage.get(key) : null)),
  setItem: jest.fn(async (key, value) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key) => { mockStorage.delete(key); }),
}));

import { getChatRecipients, hasUnreadChat, markChatRead } from '../services/chatService';
import {
  savePendingReport,
  getPendingReports,
  getFailedReports,
  markReportAsFailed,
  retryFailedReports,
  updatePendingReport,
} from '../services/offlineReportsService';

const USERS = [
  { id: 'u-admin', email: 'admin@test.com', role: 'admin' },
  { id: 'u-dir1', email: 'dir1@test.com', role: 'director' },
  { id: 'u-dir2', email: 'Dir2@test.com', role: 'director' },
  { id: 'u-baja', email: 'baja@test.com', role: 'director', active: false },
  { id: 'u-otro', email: 'otro@test.com', role: 'director' },
];
const TASK = { id: 't1', title: 'Tarea', createdBy: 'u-admin', assignedTo: ['dir1@test.com', 'dir2@test.com', 'baja@test.com'] };

describe('getChatRecipients', () => {
  test('avisa a los demás asignados y a quien creó la tarea, no a quien escribe', () => {
    const recipients = getChatRecipients(TASK, USERS, { userId: 'u-dir1', email: 'dir1@test.com' });
    expect(recipients.map(u => u.id).sort()).toEqual(['u-admin', 'u-dir2']);
  });

  test('no avisa a cuentas desactivadas ni a usuarios ajenos a la tarea', () => {
    const ids = getChatRecipients(TASK, USERS, { userId: 'u-admin', email: 'admin@test.com' }).map(u => u.id);
    expect(ids).not.toContain('u-baja');
    expect(ids).not.toContain('u-otro');
    expect(ids).not.toContain('u-admin');
  });
});

describe('hasUnreadChat', () => {
  const me = { email: 'dir1@test.com', displayName: 'Director Uno' };

  test('sin mensajes no hay nada sin leer', () => {
    expect(hasUnreadChat({ id: 't1' }, me)).toBe(false);
  });

  test('un mensaje de otra persona cuenta como no leído hasta abrir el chat', async () => {
    const task = { id: 't-nuevo', lastMessageAt: Date.now() - 1000, lastMessageByEmail: 'dir2@test.com' };
    expect(hasUnreadChat(task, me)).toBe(true);
    await markChatRead('t-nuevo', me.email);
    expect(hasUnreadChat(task, me)).toBe(false);
  });

  test('mi propio mensaje nunca aparece como no leído', () => {
    const task = { id: 't-mio', lastMessageAt: Date.now(), lastMessageByEmail: 'DIR1@test.com' };
    expect(hasUnreadChat(task, me)).toBe(false);
  });

  test('lo leído por un usuario no marca como leído para otro', async () => {
    const task = { id: 't-dos', lastMessageAt: Date.now() - 1000, lastMessageByEmail: 'admin@test.com' };
    await markChatRead('t-dos', me.email);
    expect(hasUnreadChat(task, { email: 'dir2@test.com' })).toBe(true);
  });
});

describe('reportes pendientes', () => {
  beforeEach(() => mockStorage.clear());

  test('un reporte fallido vuelve a pendientes una sola vez', async () => {
    const id1 = await savePendingReport({ taskId: 't1', title: 'Uno', images: [] });
    const id2 = await savePendingReport({ taskId: 't1', title: 'Dos', images: [] });
    await markReportAsFailed(id1);
    await markReportAsFailed(id2);
    expect(await getPendingReports()).toHaveLength(0);

    await retryFailedReports();
    await retryFailedReports();

    const pending = await getPendingReports();
    expect(pending.map(r => r.id).sort()).toEqual([id1, id2].sort());
    expect(await getFailedReports()).toHaveLength(0);
  });

  test('guarda el ID del servidor y las fotos que faltan para no duplicar al reintentar', async () => {
    const id = await savePendingReport({ taskId: 't1', title: 'Con fotos', images: ['data:a', 'data:b'] });
    await updatePendingReport(id, { cloudId: 'cloud-1', images: ['data:b'], imageCount: 1 });

    const [report] = await getPendingReports();
    expect(report).toMatchObject({ cloudId: 'cloud-1', images: ['data:b'], imageCount: 1, title: 'Con fotos' });
  });

  test('un reporte que agotó sus reintentos se queda en fallidos', async () => {
    const id = await savePendingReport({ taskId: 't1', title: 'Agotado', images: [] });
    await updatePendingReport(id, { retries: 5 });
    await markReportAsFailed(id);
    await retryFailedReports();
    expect(await getPendingReports()).toHaveLength(0);
    expect(await getFailedReports()).toHaveLength(1);
  });
});
