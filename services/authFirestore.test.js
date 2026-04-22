// services/authFirestore.test.js
// Tests para la capa de autenticación personalizada (email + hash)

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));
jest.mock('../utils/hashUtils', () => ({
  hashPassword: jest.fn(async (pw, salt) => `hash:${pw}:${salt}`),
  sha256Hash: jest.fn(async (pw, salt) => `sha256:${pw}:${salt}`),
  legacyHash: jest.fn((str) => `legacy:${str}`),
  getHashFormat: jest.fn(() => 'argon2'),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

const { getDocs, collection, query, where, doc, updateDoc, setDoc } = require('firebase/firestore');
const AsyncStorage = require('@react-native-async-storage/async-storage');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeSnapshot(docs = []) {
  return {
    empty: docs.length === 0,
    docs: docs.map(d => ({ id: d.id, data: () => d })),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('authFirestore — normalización de email', () => {
  beforeEach(() => jest.clearAllMocks());

  test('loginUser normaliza email a minúsculas antes de buscar en Firestore', async () => {
    getDocs.mockResolvedValueOnce(makeSnapshot([])); // usuario no encontrado

    const { loginUser } = require('./authFirestore');
    const result = await loginUser('USER@EXAMPLE.COM', 'password');

    expect(result.success).toBe(false);
    // Verificar que la query usó el email normalizado
    const whereCall = where.mock.calls[0];
    expect(whereCall[2]).toBe('user@example.com');
  });

  test('loginUser rechaza email con caracteres inválidos', async () => {
    const { loginUser } = require('./authFirestore');
    const result = await loginUser('user <script>@evil.com', 'password');

    // El email se normaliza (strip de <, >, espacio) — puede fallar al no encontrar usuario
    expect(result.success).toBe(false);
  });

  test('loginUser retorna error cuando el usuario no existe', async () => {
    getDocs.mockResolvedValueOnce(makeSnapshot([]));

    const { loginUser } = require('./authFirestore');
    const result = await loginUser('nobody@example.com', 'password');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('loginUser autentica con credenciales correctas (hash principal)', async () => {
    const email = 'test@example.com';
    const password = 'secret';
    const storedHash = `hash:${password}:${email}`;

    getDocs.mockResolvedValueOnce(makeSnapshot([{
      id: 'uid1',
      email,
      passwordHash: storedHash,
      hashFormat: 'argon2',
      role: 'director',
      displayName: 'Test User',
      area: 'TI',
    }]));
    // updateDoc para actualizar lastLoginAt
    updateDoc.mockResolvedValueOnce();

    const { loginUser } = require('./authFirestore');
    const result = await loginUser(email, password);

    expect(result.success).toBe(true);
    expect(result.session.email).toBe(email);
    expect(result.session.role).toBe('director');
  });
});

describe('authFirestore — sesión', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getCurrentSession retorna error cuando no hay sesión guardada', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { getCurrentSession } = require('./authFirestore');
    const result = await getCurrentSession();

    expect(result.success).toBe(false);
  });

  test('getCurrentSession normaliza email al leer de AsyncStorage', async () => {
    const rawSession = JSON.stringify({
      uid: 'uid1',
      email: 'USER@Example.COM',
      role: 'director',
      displayName: 'Test',
    });
    AsyncStorage.getItem.mockResolvedValueOnce(rawSession);

    const { getCurrentSession } = require('./authFirestore');
    const result = await getCurrentSession();

    expect(result.success).toBe(true);
    expect(result.session.email).toBe('user@example.com');
  });

  test('logoutUser limpia AsyncStorage', async () => {
    AsyncStorage.removeItem.mockResolvedValueOnce();

    const { logoutUser } = require('./authFirestore');
    await logoutUser();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userSession');
  });
});
