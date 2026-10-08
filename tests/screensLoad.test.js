// tests/screensLoad.test.js
// Cada pantalla se carga bajo demanda (React.lazy): un error al evaluar el módulo
// —un import roto, un estilo que usa una variable que no existe— no aparece hasta que
// alguien abre esa pantalla. Aquí se cargan todas para detectarlo antes.

jest.mock('../firebase', () => ({
  db: {}, auth: {}, app: {}, storage: {}, firebaseConfig: {},
  getServerTimestamp: jest.fn(),
}));
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn(), getApps: jest.fn(() => []) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(), signInWithEmailAndPassword: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signOut: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(), ref: jest.fn(), uploadBytes: jest.fn(), uploadBytesResumable: jest.fn(),
  uploadString: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn(),
}));
jest.mock('firebase/firestore', () => new Proxy({}, {
  get: (target, prop) => {
    if (prop === '__esModule') return false;
    if (prop === 'Timestamp') return { now: () => ({ toMillis: () => 0 }), fromDate: (d) => d, fromMillis: (ms) => ms };
    if (!target[prop]) target[prop] = jest.fn();
    return target[prop];
  },
}));

// Librerías nativas y de interfaz: aquí solo importa que el módulo de la pantalla se
// evalúe, así que cualquier cosa que se pida de ellas es una función vacía.
const mockStub = () => {
  const fn = () => null;
  return new Proxy(fn, {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return mockStub();
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return target[prop];
      if (!(prop in target)) target[prop] = mockStub();
      return target[prop];
    },
    apply: () => mockStub(),
    construct: () => ({}),
  });
};
jest.mock('expo-linear-gradient', () => mockStub());
jest.mock('@expo/vector-icons', () => mockStub());
jest.mock('expo-blur', () => mockStub());
jest.mock('expo-haptics', () => mockStub());
jest.mock('expo-image-picker', () => mockStub());
jest.mock('expo-image-manipulator', () => mockStub());
jest.mock('expo-file-system', () => mockStub());
jest.mock('expo-sharing', () => mockStub());
jest.mock('expo-notifications', () => mockStub());
jest.mock('expo-device', () => mockStub());
jest.mock('expo-constants', () => mockStub());
jest.mock('react-native-toast-message', () => mockStub());
jest.mock('react-native-chart-kit', () => mockStub());
jest.mock('react-native-svg', () => mockStub());
jest.mock('react-native-gesture-handler', () => mockStub());
jest.mock('react-native-confetti-cannon', () => mockStub());
jest.mock('react-native-safe-area-context', () => mockStub());
jest.mock('@react-native-community/datetimepicker', () => mockStub());
jest.mock('@react-native-community/netinfo', () => mockStub());
jest.mock('@react-native-async-storage/async-storage', () => mockStub());
jest.mock('@react-navigation/native', () => mockStub());

const SCREENS = [
  'LoginScreen', 'HomeScreen', 'KanbanScreen', 'CalendarScreen', 'MyInboxScreen', 'MoreScreen',
  'ReportsScreen', 'SecretarioDashboardScreen', 'AdminExecutiveDashboard', 'AdminScreen',
  'AdminReportsScreen', 'MyAreaReportsScreen', 'TaskDetailScreen', 'TaskChatScreen',
  'TaskProgressScreen', 'NotificationsScreen', 'AreaChiefDashboard', 'area/AreaManagementScreen',
  'AnalyticsScreen', 'TaskReportsAndActivityScreen', 'ProfileScreen',
  'SearchScreen', 'SettingsScreen', 'TrashScreen',
];

describe('las pantallas se pueden cargar', () => {
  beforeAll(() => {
    // El entorno de pruebas no siempre trae Platform.select
    const { Platform } = require('react-native');
    if (typeof Platform.select !== 'function') {
      Platform.select = (options) => options.ios ?? options.native ?? options.default;
    }
  });

  test.each(SCREENS)('%s', (name) => {
    const mod = require(`../screens/${name}`);
    expect(typeof mod.default).toMatch(/function|object/);
  });
});
