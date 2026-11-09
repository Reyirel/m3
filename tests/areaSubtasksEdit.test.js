// tests/areaSubtasksEdit.test.js
// Cambiar las áreas de una tarea ya creada ajusta sus subtareas por área:
// un área nueva recibe la suya y la de un área quitada va a la papelera.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../config/areas', () => ({ getSecretariasForAreas: (areas) => areas.map((a) => `Sec ${a}`) }));

const mockSets = [];
const mockUpdates = [];
const mockCommit = jest.fn(async () => {});
let mockSubtasks = [];
let mockNewId = 0;
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ col: 'tasks' })),
  doc: jest.fn((_db, _col, id) => ({ id: id || `nueva${++mockNewId}` })),
  query: jest.fn(() => ({})),
  where: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: mockSubtasks.map((st) => ({ id: st.id, data: () => st })) })),
  getDoc: jest.fn(async () => ({ exists: () => true, data: () => ({ status: 'en_proceso' }) })),
  updateDoc: jest.fn(async (ref, data) => { mockUpdates.push({ id: ref.id, data, direct: true }); }),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: { now: jest.fn(() => 'NOW') },
  writeBatch: jest.fn(() => ({
    set: (ref, data) => mockSets.push({ id: ref.id, data }),
    update: (ref, data) => mockUpdates.push({ id: ref.id, data }),
    commit: mockCommit,
  })),
}));

import { syncAreaSubtasksAfterEdit } from '../services/areaSubtasks';

const PARENT = { title: 'Feria', createdBy: 'admin@test.com', dueAt: 'DUE' };

beforeEach(() => {
  mockSets.length = 0;
  mockUpdates.length = 0;
  mockCommit.mockClear();
  mockNewId = 0;
  mockSubtasks = [
    { id: 's1', area: 'Turismo', status: 'en_revision', isAreaSubtask: true },
    { id: 's2', area: 'Obras', status: 'pendiente', isAreaSubtask: true },
  ];
});

test('un área agregada recibe su subtarea; las existentes no se tocan', async () => {
  const result = await syncAreaSubtasksAfterEdit('p1', { ...PARENT, areas: ['Turismo', 'Obras', 'Cultura'] });

  expect(result).toEqual({ added: 1, removed: 0 });
  expect(mockSets).toHaveLength(1);
  expect(mockSets[0].data).toMatchObject({
    area: 'Cultura', parentTaskId: 'p1', isAreaSubtask: true, status: 'pendiente', title: '[Cultura] Feria',
  });
  expect(mockUpdates.find((u) => u.id === 'p1' && !u.direct).data).toMatchObject({ isCoordinationTask: true, subtaskCount: 3 });
});

test('la subtarea de un área quitada va a la papelera marcada como areaRemoved', async () => {
  const result = await syncAreaSubtasksAfterEdit('p1', { ...PARENT, areas: ['Turismo', 'Cultura'] }, 'admin@test.com');

  expect(result).toEqual({ added: 1, removed: 1 });
  expect(mockUpdates.find((u) => u.id === 's2').data).toMatchObject({
    deleted: true, areaRemoved: true, deletedBy: 'admin@test.com',
  });
  expect(mockUpdates.some((u) => u.id === 's1')).toBe(false);
});

test('con una sola área la tarea deja de ser de coordinación y sus subtareas van a la papelera', async () => {
  const result = await syncAreaSubtasksAfterEdit('p1', { ...PARENT, areas: ['Turismo'] });

  expect(result).toEqual({ added: 0, removed: 2 });
  expect(mockSets).toHaveLength(0);
  expect(mockUpdates.find((u) => u.id === 'p1').data).toMatchObject({ isCoordinationTask: false, subtaskCount: 0 });
});

test('sin cambios de áreas no escribe nada', async () => {
  const result = await syncAreaSubtasksAfterEdit('p1', { ...PARENT, areas: ['Obras', 'Turismo'] });

  expect(result).toEqual({ added: 0, removed: 0 });
  expect(mockCommit).not.toHaveBeenCalled();
});

test('las subtareas ya en la papelera no cuentan como existentes', async () => {
  mockSubtasks[1].deleted = true;
  const result = await syncAreaSubtasksAfterEdit('p1', { ...PARENT, areas: ['Turismo', 'Obras'] });

  expect(result).toEqual({ added: 1, removed: 0 });
  expect(mockSets[0].data.area).toBe('Obras');
});
