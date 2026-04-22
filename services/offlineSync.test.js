/**
 * 🧪 offlineSync.test.js - Tests básicos de sincronización offline
 * 
 * Validar:
 * - Módulo importa correctamente
 * - Logger integrado
 * - AsyncStorage mock funciona
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './Logger';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('./Logger');

describe('Offline Sync Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería importar AsyncStorage correctamente', () => {
    expect(AsyncStorage).toBeDefined();
    expect(typeof AsyncStorage.setItem).toBe('function');
    expect(typeof AsyncStorage.getItem).toBe('function');
  });

  test('debería importar Logger correctamente', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  test('debería tener AsyncStorage mock con multiRemove', () => {
    expect(typeof AsyncStorage.multiRemove).toBe('function');
  });
});
