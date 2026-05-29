/**
 * Jest Setup - Configuración inicial para tests
 */

// Mock de Firebase (si es necesario)
jest.mock('./firebase.js', () => ({
  auth: {},
  db: {},
}));

// Mock de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

// Silenciar console en tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock de Platform - antes de cargar otros módulos
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: '11',
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TouchableOpacity: 'TouchableOpacity',
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Animated: {
    Value: jest.fn(),
    View: 'AnimatedView',
    event: jest.fn(),
    timing: jest.fn(),
  },
  Keyboard: {
    dismiss: jest.fn(),
  },
}));

// Mock de netinfo después de React Native
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));
