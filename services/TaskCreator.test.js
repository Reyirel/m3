/**
 * 🧪 TaskCreator.test.js - Tests de integración básicos
 * 
 * Validar que TaskCreator:
 * - Se puede importar correctamente
 * - Expone el método create()
 * - Integra con Logger
 */

import TaskCreator from './TaskCreator';
import logger from './Logger';

// Mock de firebase
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

jest.mock('./Logger');

describe('TaskCreator Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería importar correctamente el módulo', () => {
    expect(TaskCreator).toBeDefined();
    expect(typeof TaskCreator).toBe('object');
  });

  test('debería exportar método create', () => {
    expect(typeof TaskCreator.create).toBe('function');
  });

  test('debería importar Logger correctamente', () => {
    expect(logger).toBeDefined();
  });

  test('debería tener métodos esperados', () => {
    expect(typeof TaskCreator.create).toBe('function');
  });
});
