// tests/render/screens.test.js
// Dibuja las pantallas con datos de ejemplo. Si una pantalla lanza un error al
// renderizar (una variable que no existe, un componente sin importar), falla aquí
// en vez de mostrarle "Algo salió mal" al usuario.
import React from 'react';
import renderer, { act } from 'react-test-renderer';

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

// firebase.js reexporta las funciones de Firestore: las suscripciones devuelven su
// función para cancelar y las lecturas, un resultado vacío
jest.mock('../../firebase', () => {
  const empty = { docs: [], empty: true, size: 0, forEach: () => {}, exists: () => false, data: () => ({}) };
  const read = () => Promise.resolve(empty);
  const ref = () => ({});
  return {
    db: {}, auth: {}, app: {}, storage: {}, analytics: null, firebaseConfig: {},
    getServerTimestamp: () => 0,
    collection: ref, doc: ref, query: ref, where: ref, orderBy: ref, limit: ref,
    onSnapshot: () => () => {},
    getDoc: read, getDocs: read, addDoc: read, setDoc: read, updateDoc: read, deleteDoc: read,
    serverTimestamp: () => 0, arrayUnion: ref, arrayRemove: ref, increment: ref,
    writeBatch: () => ({ update: () => {}, set: () => {}, delete: () => {}, commit: read }),
    Timestamp: { now: () => ({ toMillis: () => 0 }), fromDate: (d) => d, fromMillis: (ms) => ms },
  };
});
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn(), getApps: jest.fn(() => []) }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(), signInWithEmailAndPassword: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn(), ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('firebase/firestore', () => new Proxy({}, {
  get: (target, prop) => {
    if (prop === '__esModule') return false;
    // Las suscripciones devuelven su función para cancelar
    if (prop === 'onSnapshot') return () => () => {};
    if (prop === 'Timestamp') return { now: () => ({ toMillis: () => 0 }), fromDate: (d) => d, fromMillis: (ms) => ms };
    if (!target[prop]) {
      target[prop] = jest.fn(() => Promise.resolve({ docs: [], empty: true, forEach: () => {}, exists: () => false }));
    }
    return target[prop];
  },
}));

const mockTheme = { mode: 'light' };

jest.mock('@react-native-async-storage/async-storage', () => ({
  // 'appTheme' es la clave donde ThemeContext guarda el tema elegido
  getItem: jest.fn((key) => Promise.resolve(key === 'appTheme' ? mockTheme.mode : null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, { show: jest.fn(), hide: jest.fn() }),
}));
jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null, BarChart: () => null, PieChart: () => null, ProgressChart: () => null,
}));
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});
jest.mock('expo-haptics', () => mockStub());
jest.mock('expo-notifications', () => mockStub());
jest.mock('expo-device', () => mockStub());
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.0.0', extra: {} } } }));
jest.mock('expo-image-picker', () => mockStub());
jest.mock('expo-image-manipulator', () => mockStub());
jest.mock('expo-file-system', () => mockStub());
jest.mock('expo-sharing', () => mockStub());
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { Swipeable: View, GestureHandlerRootView: View };
});
jest.mock('react-native-confetti-cannon', () => () => null);
jest.mock('@react-native-community/datetimepicker', () => () => null);

const mockHour = 60 * 60 * 1000;
const mockDay = 24 * mockHour;
const mockNow = Date.now();
const mockArea = 'Dirección de Turismo';
const mockUser = {
  userId: 'u1', email: 'admin@m.com', displayName: 'Ana Admin', role: 'admin', area: mockArea, direcciones: [],
};
const mockTasks = [
  {
    id: 't1', title: 'Informe anual', description: 'Detalle', area: mockArea, status: 'pendiente', priority: 'alta',
    dueAt: mockNow - 3 * mockDay, createdAt: mockNow - 10 * mockDay,
    assignedTo: ['tur@m.com'], assignedToNames: ['Tere Turismo'], tags: ['informe', 'anual', 'extra'],
  },
  {
    id: 't2', title: 'Feria regional', area: mockArea, status: 'en_proceso', priority: 'media',
    dueAt: mockNow + 3 * mockHour, createdAt: mockNow - 2 * mockDay,
    assignedTo: ['tur@m.com'], assignedToNames: ['Tere Turismo'],
    progressPercentage: 40, subtasksTotal: 5, subtasksDone: 2,
  },
  {
    id: 't3', title: 'Padrón', area: 'Dirección de Cultura', status: 'en_revision', priority: 'baja',
    dueAt: mockNow + 2 * mockDay, createdAt: mockNow - mockDay, assignedTo: [], assignedToNames: [],
  },
  {
    id: 't4', title: 'Cerrada', area: mockArea, status: 'cerrada', priority: 'media',
    dueAt: mockNow - mockDay, createdAt: mockNow - 5 * mockDay, completedAt: mockNow - 2 * mockDay,
    assignedTo: ['tur@m.com'], assignedToNames: ['Tere Turismo'],
  },
];

jest.mock('../../contexts/TasksContext', () => ({
  useTasks: () => ({
    tasks: mockTasks, setTasks: jest.fn(), isLoading: false, isOnline: true, currentUser: mockUser, deleteManager: {},
  }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser, isAuthenticated: true,
    isAdmin: mockUser.role === 'admin',
    isSecretario: mockUser.role === 'secretario',
    isDirector: mockUser.role === 'director',
    isLoading: false, reload: jest.fn(), signOut: jest.fn(),
  }),
}));

const navigation = {
  navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn(), setOptions: jest.fn(),
  addListener: jest.fn(() => () => {}), canGoBack: () => true, isFocused: () => true,
};

// Cada rol ve la app distinta (pestañas, botones, tareas): se dibuja con los tres
const ROLES = {
  admin: { email: 'admin@m.com', displayName: 'Ana Admin', role: 'admin', area: mockArea, direcciones: [] },
  secretario: {
    email: 'sec@m.com', displayName: 'Saúl Secretario', role: 'secretario',
    area: 'Secretaría de Desarrollo Económico y Turismo', direcciones: [mockArea],
  },
  director: { email: 'tur@m.com', displayName: 'Tere Turismo', role: 'director', area: mockArea, direcciones: [] },
};

const taskParams = { route: { params: { taskId: 't2', taskTitle: 'Feria regional', task: mockTasks[1] } } };

const SCREENS = [
  ['HomeScreen', {}],
  ['MyInboxScreen', {}],
  ['MyInboxScreen', { route: { params: { preset: { filters: { overdue: true }, at: 1 } } } }],
  ['ReportsScreen', {}],
  ['ReportsScreen', { route: { params: { tab: 'enviados' } } }],
  ['ReportsScreen', { route: { params: { tab: 'analiticas' } } }],
  ['AdminExecutiveDashboard', {}],
  ['AdminReportsScreen', { embedded: true }],
  ['AnalyticsScreen', { embedded: true }],
  ['MyAreaReportsScreen', { embedded: true }],
  ['CalendarScreen', {}],
  ['KanbanScreen', {}],
  ['NotificationsScreen', {}],
  ['MoreScreen', {}],
  ['ProfileScreen', {}],
  ['SettingsScreen', {}],
  ['SearchScreen', {}],
  ['LoginScreen', {}],
  ['AdminScreen', {}],
  ['SecretarioDashboardScreen', {}],
  ['AreaChiefDashboard', {}],
  ['TrashScreen', {}],
  ['TaskDetailScreen', {}],
  ['TaskDetailScreen', taskParams],
  ['TaskChatScreen', taskParams],
  ['TaskProgressScreen', taskParams],
  ['TaskReportsAndActivityScreen', taskParams],
  ['area/AreaManagementScreen', {}],
];

// Tres roles en tema claro, y el administrador también en tema oscuro
const CASES = [
  ...Object.keys(ROLES).flatMap((role) => SCREENS.map(([name, props]) => [role, 'light', name, props])),
  ...SCREENS.map(([name, props]) => ['admin', 'dark', name, props]),
];

describe('las pantallas se dibujan sin errores', () => {
  beforeAll(() => { jest.useFakeTimers(); });
  afterAll(() => { jest.useRealTimers(); });

  test.each(CASES)('%s · %s · %s %j', async (role, themeMode, name, props) => {
    Object.assign(mockUser, ROLES[role]);
    mockTheme.mode = themeMode;
    const { ThemeProvider } = require('../../contexts/ThemeContext');
    const Screen = require(`../../screens/${name}`).default;
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ThemeProvider>
          <React.Suspense fallback={null}>
            <Screen navigation={navigation} route={{ params: {} }} {...props} />
          </React.Suspense>
        </ThemeProvider>
      );
    });
    // Efectos, suscripciones y animaciones de entrada
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(tree.toJSON()).not.toBeNull();
    await act(async () => { tree.unmount(); });
  });
});
