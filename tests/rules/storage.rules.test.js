// tests/rules/storage.rules.test.js
// Reglas de Storage (storage.rules) probadas en el emulador.

const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

const JPEG = { contentType: 'image/jpeg' };
const photo = (bytes = 2048) => new Uint8Array(bytes);

// Cada prueba usa nombres de archivo propios: las reglas no dejan sobrescribir, así que
// un archivo que quedara de otra prueba haría fallar la subida
let fileCount = 0;
const uniqueName = (extension = 'jpg') => `foto-${Date.now()}-${++fileCount}.${extension}`;

let testEnv;
const storageOf = (uid) => testEnv.authenticatedContext(uid, { email: `${uid}@test.com` }).storage();
const anonStorage = () => testEnv.unauthenticatedContext().storage();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-m3',
    storage: {
      rules: fs.readFileSync(path.join(__dirname, '..', '..', 'storage.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.clearStorage();
  await testEnv.cleanup();
});

describe('fotos del chat y de los reportes', () => {
  test('sin sesión no se sube ni se lee', async () => {
    const file = `chat-images/${uniqueName()}`;
    await assertFails(uploadBytes(ref(anonStorage(), file), photo(), JPEG));
    await assertSucceeds(uploadBytes(ref(storageOf('uno'), file), photo(), JPEG));
    await assertFails(getBytes(ref(anonStorage(), file)));
  });

  test('con sesión se suben y se leen fotos en las dos carpetas', async () => {
    const storage = storageOf('uno');
    const chatFile = `chat-images/${uniqueName()}`;
    await assertSucceeds(uploadBytes(ref(storage, chatFile), photo(), JPEG));
    await assertSucceeds(uploadBytes(ref(storage, `task_reports/t1/r1/${uniqueName()}`), photo(), JPEG));
    await assertSucceeds(getBytes(ref(storageOf('dos'), chatFile)));
  });

  test('solo imágenes y de 5 MB como máximo', async () => {
    const storage = storageOf('uno');
    await assertFails(uploadBytes(ref(storage, `chat-images/${uniqueName('html')}`), photo(), { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(storage, `chat-images/${uniqueName('bin')}`), photo()));
    await assertFails(uploadBytes(ref(storage, `chat-images/${uniqueName()}`), photo(5 * 1024 * 1024 + 1), JPEG));
    await assertSucceeds(uploadBytes(ref(storage, `chat-images/${uniqueName('png')}`), photo(), { contentType: 'image/png' }));
  });

  test('nadie sobrescribe ni borra la foto de otro (ni la suya)', async () => {
    const file = `chat-images/${uniqueName()}`;
    await assertSucceeds(uploadBytes(ref(storageOf('uno'), file), photo(), JPEG));
    await assertFails(uploadBytes(ref(storageOf('dos'), file), photo(10), JPEG));
    await assertFails(uploadBytes(ref(storageOf('uno'), file), photo(10), JPEG));
    await assertFails(deleteObject(ref(storageOf('dos'), file)));
    await assertFails(deleteObject(ref(storageOf('uno'), file)));
  });

  test('fuera de esas carpetas no se guarda nada', async () => {
    await assertFails(uploadBytes(ref(storageOf('uno'), `otra-carpeta/${uniqueName()}`), photo(), JPEG));
    await assertFails(uploadBytes(ref(storageOf('uno'), uniqueName()), photo(), JPEG));
  });
});
