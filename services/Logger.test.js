/**
 * 🧪 Logger.test.js - Tests para el servicio centralizado de Logger
 * 
 * Validar que Logger:
 * - Se importa correctamente
 * - Tiene métodos de logging funcionales
 * - Integra correctamente con la app
 */

import logger from './Logger';

describe('Logger Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería existir y tener los métodos principales', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.perfStart).toBe('function');
    expect(typeof logger.perfEnd).toBe('function');
  });

  test('debería registrar información sin errores', () => {
    expect(() => {
      logger.info('Test Module', 'Test message', { key: 'value' });
    }).not.toThrow();
  });

  test('debería registrar advertencias sin errores', () => {
    expect(() => {
      logger.warn('Test Module', 'Warning message', { key: 'value' });
    }).not.toThrow();
  });

  test('debería registrar errores con contexto', () => {
    const testError = new Error('Test error');
    expect(() => {
      logger.error('Test Module', 'Error occurred', testError, { context: 'test' });
    }).not.toThrow();
  });

  test('debería trackear performance sin errores', () => {
    expect(() => {
      logger.perfStart('testOperation');
      logger.perfEnd('testOperation');
    }).not.toThrow();
  });
});
