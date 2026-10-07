// tests/taskSave.test.js
// Guardar una tarea desde el formulario: editar debe actualizar la tarea existente (no
// crear otra) y un guardado que falla no debe anunciarse como éxito.

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial) => [initial, jest.fn()],
  useCallback: (fn) => fn,
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('../services/TaskCreator', () => ({
  __esModule: true,
  default: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));
jest.mock('../services/tasks', () => ({ updateTask: jest.fn() }));
jest.mock('../services/tasksMultiple', () => ({ addSubtask: jest.fn(), updateTaskMultiple: jest.fn() }));
jest.mock('../services/authFirestore', () => ({ getCurrentSession: jest.fn() }));
jest.mock('../services/notifications', () => ({
  scheduleNotificationForTask: jest.fn(async () => null),
  cancelNotification: jest.fn(async () => {}),
}));

import TaskCreator from '../services/TaskCreator';
import { getCurrentSession } from '../services/authFirestore';
import { useTaskOperations } from '../hooks/useTaskOperations';

const ADMIN = { userId: 'u1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' };
const EXISTING_TASK = { id: 'tarea-1', title: 'Título anterior', status: 'pendiente', assignedTo: ['uno@test.com'] };

const formData = (overrides = {}) => ({
  title: 'Revisar expediente',
  description: 'Descripción suficientemente larga',
  priority: 'media',
  status: 'pendiente',
  dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  selectedAssignees: [{ email: 'uno@test.com' }],
  selectedAreas: ['Dirección Jurídica'],
  tags: [],
  ...overrides,
});

describe('guardar tarea desde el formulario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentSession.mockResolvedValue({ success: true, session: ADMIN });
    TaskCreator.create.mockResolvedValue({ success: true, taskId: 'nueva-1' });
    TaskCreator.update.mockResolvedValue({ success: true });
    TaskCreator.delete.mockResolvedValue({ success: true });
  });

  test('editar actualiza la tarea existente y no crea otra', async () => {
    const { save } = useTaskOperations(EXISTING_TASK, ADMIN);

    const result = await save(formData({ title: 'Título corregido' }));

    expect(result).toBeTruthy();
    expect(TaskCreator.create).not.toHaveBeenCalled();
    expect(TaskCreator.update).toHaveBeenCalledTimes(1);
    expect(TaskCreator.update.mock.calls[0][0]).toBe('tarea-1');
    expect(TaskCreator.update.mock.calls[0][1].title).toBe('Título corregido');
    expect(mockShowSuccess).toHaveBeenCalledWith('¡Tarea actualizada!');
  });

  test('una tarea nueva se crea', async () => {
    const { save } = useTaskOperations(null, ADMIN);

    const result = await save(formData());

    expect(result).toBeTruthy();
    expect(TaskCreator.create).toHaveBeenCalledTimes(1);
    expect(TaskCreator.update).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('¡Tarea creada!');
  });

  test('si el guardado falla se muestra el error y no se anuncia éxito', async () => {
    TaskCreator.update.mockResolvedValue({ success: false, error: 'La tarea ya no existe' });
    const { save } = useTaskOperations(EXISTING_TASK, ADMIN);

    const result = await save(formData());

    expect(result).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith('La tarea ya no existe');
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  test('una tarea guardada sin conexión lo dice en el aviso', async () => {
    TaskCreator.create.mockResolvedValue({ success: true, taskId: 'temp_1', offline: true });
    const { save } = useTaskOperations(null, ADMIN);

    await save(formData());

    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('recuperar la conexión'));
  });

  test('eliminar que falla no se anuncia como eliminado', async () => {
    TaskCreator.delete.mockResolvedValue({ success: false, error: 'Sin permiso' });
    const { deleteTask } = useTaskOperations(EXISTING_TASK, ADMIN);

    const result = await deleteTask('tarea-1');

    expect(result).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith('Sin permiso');
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });
});
