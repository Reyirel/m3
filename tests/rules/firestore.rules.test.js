// tests/rules/firestore.rules.test.js
// Reglas seguras de Firestore (firestore.secure.rules) probadas en el emulador.
// Las consultas y escrituras imitan las que hace la app.

const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, runTransaction, writeBatch,
} = require('firebase/firestore');

const SECRETARIA = 'Secretaría de Obras Públicas y Desarrollo Urbano';

const USERS = {
  admin: { uid: 'u-admin', email: 'admin@test.com', role: 'admin', active: true },
  director: { uid: 'u-director', email: 'director@test.com', role: 'director', active: true, area: 'Dirección de Obras Públicas' },
  otroDirector: { uid: 'u-otro', email: 'otro@test.com', role: 'director', active: true, area: 'Dirección de Catastro' },
  secretario: { uid: 'u-secretario', email: 'secretario@test.com', role: 'secretario', active: true, area: SECRETARIA },
  desactivado: { uid: 'u-baja', email: 'baja@test.com', role: 'director', active: false },
};

const TASK = {
  title: 'Revisar expediente',
  description: 'Descripción de la tarea',
  status: 'pendiente',
  priority: 'media',
  assignedTo: [USERS.director.email],
  assignedToNames: ['Director'],
  secretarias: [SECRETARIA],
  completedBy: [],
  createdAt: new Date(),
};

let testEnv;
const dbOf = (user) => testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

// Datos de partida, escritos sin pasar por las reglas
const seed = async (docs) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.entries(docs).map(([docPath, data]) => setDoc(doc(db, docPath), data)));
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-m3',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.secure.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const users = {};
  Object.values(USERS).forEach(({ uid, ...data }) => { users[`users/${uid}`] = data; });
  await seed({
    ...users,
    'tasks/t1': TASK,
    'tasks/ajena': { ...TASK, assignedTo: [USERS.otroDirector.email], secretarias: ['Otra secretaría'] },
    'tasks/cerrada': { ...TASK, status: 'cerrada' },
  });
});

describe('sin sesión', () => {
  test('no se lee ni se escribe nada', async () => {
    await assertFails(getDocs(collection(anonDb(), 'users')));
    await assertFails(getDoc(doc(anonDb(), 'tasks/t1')));
    await assertFails(setDoc(doc(anonDb(), 'tasks/nueva'), TASK));
    await assertFails(updateDoc(doc(anonDb(), `users/${USERS.director.uid}`), { role: 'admin' }));
  });
});

describe('usuarios', () => {
  test('un usuario activo ve el directorio', async () => {
    await assertSucceeds(getDocs(collection(dbOf(USERS.director), 'users')));
  });

  test('nadie se cambia el rol, el área ni la secretaría a sí mismo', async () => {
    const own = doc(dbOf(USERS.director), `users/${USERS.director.uid}`);
    await assertFails(updateDoc(own, { role: 'admin' }));
    await assertFails(updateDoc(own, { area: SECRETARIA }));
    await assertFails(updateDoc(own, { secretaria: SECRETARIA }));
    await assertFails(updateDoc(own, { active: true, email: 'x@test.com' }));
    await assertSucceeds(updateDoc(own, { displayName: 'Nuevo nombre' }));
  });

  test('un usuario no edita el perfil de otro', async () => {
    await assertFails(updateDoc(doc(dbOf(USERS.director), `users/${USERS.otroDirector.uid}`), { displayName: 'X' }));
  });

  test('solo el administrador crea, cambia de rol y borra usuarios', async () => {
    await assertFails(setDoc(doc(dbOf(USERS.secretario), 'users/nuevo'), { email: 'n@test.com', role: 'admin' }));
    await assertSucceeds(setDoc(doc(dbOf(USERS.admin), 'users/nuevo'), { email: 'n@test.com', role: 'director', active: true }));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.admin), `users/${USERS.director.uid}`), { role: 'secretario' }));
    await assertFails(deleteDoc(doc(dbOf(USERS.secretario), 'users/nuevo')));
    await assertSucceeds(deleteDoc(doc(dbOf(USERS.admin), 'users/nuevo')));
  });

  test('una cuenta desactivada solo lee su propio documento', async () => {
    const db = dbOf(USERS.desactivado);
    await assertSucceeds(getDoc(doc(db, `users/${USERS.desactivado.uid}`)));
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(getDoc(doc(db, 'tasks/t1')));
  });

  test('una cuenta de Firebase Auth sin documento en users no ve nada', async () => {
    const db = dbOf({ uid: 'sin-documento', email: 'x@test.com' });
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(getDocs(query(collection(db, 'tasks'), where('assignedTo', 'array-contains', 'x@test.com'))));
  });
});

describe('tareas — lectura', () => {
  test('el director consulta las asignadas a su correo', async () => {
    const tasks = collection(dbOf(USERS.director), 'tasks');
    const result = await assertSucceeds(
      getDocs(query(tasks, where('assignedTo', 'array-contains', USERS.director.email)))
    );
    expect(result.docs.map((d) => d.id).sort()).toEqual(['cerrada', 't1']);
  });

  test('el director no puede pedir todas las tareas ni las de otro correo', async () => {
    const tasks = collection(dbOf(USERS.director), 'tasks');
    await assertFails(getDocs(query(tasks, orderBy('createdAt', 'desc'))));
    await assertFails(getDocs(query(tasks, where('assignedTo', 'array-contains', USERS.otroDirector.email))));
    await assertFails(getDoc(doc(dbOf(USERS.director), 'tasks/ajena')));
  });

  test('el secretario consulta las de su secretaría', async () => {
    const tasks = collection(dbOf(USERS.secretario), 'tasks');
    const result = await assertSucceeds(
      getDocs(query(tasks, where('secretarias', 'array-contains', SECRETARIA)))
    );
    expect(result.docs.map((d) => d.id).sort()).toEqual(['cerrada', 't1']);
    await assertFails(getDocs(query(tasks, where('secretarias', 'array-contains', 'Otra secretaría'))));
  });

  test('el administrador consulta todas, la papelera y una tarea que no existe', async () => {
    const db = dbOf(USERS.admin);
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))));
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('deleted', '==', true))));
    const missing = await assertSucceeds(getDoc(doc(db, 'tasks/off_123_abc')));
    expect(missing.exists()).toBe(false);
  });
});

describe('tareas — escritura', () => {
  test('solo el administrador crea tareas, también con sus subtareas por área en un lote', async () => {
    await assertFails(setDoc(doc(dbOf(USERS.director), 'tasks/nueva'), TASK));
    await assertFails(setDoc(doc(dbOf(USERS.secretario), 'tasks/nueva'), TASK));

    const db = dbOf(USERS.admin);
    const batch = writeBatch(db);
    batch.set(doc(db, 'tasks/principal'), TASK);
    batch.set(doc(db, 'tasks/sub-a'), { ...TASK, parentTaskId: 'principal', isAreaSubtask: true, assignedTo: [] });
    batch.update(doc(db, 'tasks/principal'), { isCoordinationTask: true, subtaskCount: 1 });
    await assertSucceeds(batch.commit());
  });

  test('el asignado avanza el estado', async () => {
    const task = doc(dbOf(USERS.director), 'tasks/t1');
    await assertSucceeds(updateDoc(task, { status: 'en_proceso', updatedAt: new Date() }));
    await assertSucceeds(updateDoc(task, { status: 'en_revision', updatedAt: new Date() }));
  });

  test('un cambio de estado hecho sin conexión se guarda al sincronizar', async () => {
    // Campos que agrega la cola (services/offlineSync.js → syncUpdateOperation)
    await assertSucceeds(updateDoc(doc(dbOf(USERS.director), 'tasks/t1'), {
      status: 'en_proceso', updatedAt: new Date(), syncedAt: new Date(),
    }));
  });

  test('nadie que no sea el administrador finaliza una tarea, tampoco con una variante del estado', async () => {
    const task = doc(dbOf(USERS.director), 'tasks/t1');
    await assertFails(updateDoc(task, { status: 'cerrada' }));
    await assertFails(updateDoc(task, { status: 'completada' }));
    await assertFails(updateDoc(task, { status: 'cerrado' }));
    await assertFails(updateDoc(task, { status: 'Cerrada' }));
    await assertFails(updateDoc(doc(dbOf(USERS.secretario), 'tasks/t1'), { status: 'cerrada' }));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.admin), 'tasks/t1'), { status: 'cerrada', completedAt: new Date() }));
  });

  test('una tarea finalizada solo la reabre el administrador', async () => {
    await assertFails(updateDoc(doc(dbOf(USERS.director), 'tasks/cerrada'), { status: 'pendiente' }));
    await assertFails(updateDoc(doc(dbOf(USERS.secretario), 'tasks/cerrada'), { status: 'en_proceso' }));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.admin), 'tasks/cerrada'), { status: 'pendiente' }));
  });

  test('el asignado no edita el contenido ni manda la tarea a la papelera', async () => {
    const task = doc(dbOf(USERS.director), 'tasks/t1');
    await assertFails(updateDoc(task, { title: 'Otro título' }));
    await assertFails(updateDoc(task, { dueAt: new Date() }));
    await assertFails(updateDoc(task, { priority: 'baja' }));
    await assertFails(updateDoc(task, { deleted: true }));
  });

  test('el director no reasigna; el secretario sí delega', async () => {
    const delegation = {
      assignedTo: [USERS.director.email, USERS.otroDirector.email],
      assignedToNames: ['Director', 'Otro'],
      assignments: [],
      secretarias: [SECRETARIA],
      delegatedTo: USERS.otroDirector.email,
      delegatedBy: USERS.secretario.email,
      delegatedAt: new Date().toISOString(),
      updatedAt: new Date(),
    };
    await assertFails(updateDoc(doc(dbOf(USERS.director), 'tasks/t1'), delegation));
    await assertFails(updateDoc(doc(dbOf(USERS.director), 'tasks/t1'), { assignedTo: [] }));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.secretario), 'tasks/t1'), delegation));
  });

  test('quien no ve la tarea no la modifica', async () => {
    await assertFails(updateDoc(doc(dbOf(USERS.otroDirector), 'tasks/t1'), { status: 'en_proceso' }));
    await assertFails(updateDoc(doc(dbOf(USERS.director), 'tasks/ajena'), { status: 'en_proceso' }));
  });

  test('confirmar "mi parte" en una transacción pasa la tarea a revisión', async () => {
    // Misma escritura que services/taskConfirmations.js
    const db = dbOf(USERS.director);
    await assertSucceeds(runTransaction(db, async (transaction) => {
      const ref = doc(db, 'tasks/t1');
      const snap = await transaction.get(ref);
      transaction.update(ref, {
        completedBy: [...(snap.data().completedBy || []), { email: USERS.director.email, completedAt: new Date() }],
        updatedAt: new Date(),
        status: 'en_revision',
        allCompletedAt: new Date(),
      });
    }));
  });

  test('el chat y los reportes siguen anotándose en una tarea finalizada', async () => {
    const task = doc(dbOf(USERS.director), 'tasks/cerrada');
    await assertSucceeds(updateDoc(task, {
      lastMessageAt: new Date(), lastMessageBy: 'Director', lastMessageByEmail: USERS.director.email,
    }));
    await assertSucceeds(updateDoc(task, { reports: ['r1'], lastReportDate: new Date() }));
  });

  test('nadie borra una tarea, ni el administrador', async () => {
    await assertFails(deleteDoc(doc(dbOf(USERS.admin), 'tasks/t1')));
    await assertFails(deleteDoc(doc(dbOf(USERS.director), 'tasks/t1')));
  });
});

describe('chat y subtareas de una tarea', () => {
  test('quien ve la tarea lee y escribe en el chat, a su nombre', async () => {
    const messages = collection(dbOf(USERS.director), 'tasks/t1/messages');
    await assertSucceeds(addDoc(messages, { text: 'Hola', authorId: USERS.director.uid, createdAt: new Date() }));
    await assertSucceeds(getDocs(query(messages, orderBy('createdAt', 'asc'))));
    await assertFails(addDoc(messages, { text: 'Suplantado', authorId: USERS.admin.uid, createdAt: new Date() }));
  });

  test('los mensajes no se editan ni se borran', async () => {
    await seed({ 'tasks/t1/messages/m1': { text: 'Original', authorId: USERS.director.uid, createdAt: new Date() } });
    const message = doc(dbOf(USERS.director), 'tasks/t1/messages/m1');
    await assertFails(updateDoc(message, { text: 'Cambiado' }));
    await assertFails(deleteDoc(message));
    await assertFails(deleteDoc(doc(dbOf(USERS.admin), 'tasks/t1/messages/m1')));
  });

  test('quien no ve la tarea no entra a su chat ni a sus subtareas', async () => {
    const db = dbOf(USERS.otroDirector);
    await assertFails(getDocs(collection(db, 'tasks/t1/messages')));
    await assertFails(addDoc(collection(db, 'tasks/t1/messages'), { text: 'x', authorId: USERS.otroDirector.uid }));
    await assertFails(getDocs(collection(db, 'tasks/t1/subtasks')));
  });

  test('las subtareas las crea y completa quien ve la tarea; solo el administrador las borra', async () => {
    const subtasks = collection(dbOf(USERS.director), 'tasks/t1/subtasks');
    const created = await assertSucceeds(addDoc(subtasks, { title: 'Paso 1', status: 'pendiente', createdAt: new Date() }));
    await assertSucceeds(updateDoc(created, { status: 'completada' }));
    await assertFails(deleteDoc(created));
    await assertSucceeds(deleteDoc(doc(dbOf(USERS.admin), `tasks/t1/subtasks/${created.id}`)));
  });
});

describe('reportes', () => {
  const REPORT = { taskId: 't1', createdBy: USERS.director.email, title: 'Avance', description: 'Texto', images: [], rating: null };

  test('cada quien crea reportes a su nombre', async () => {
    const reports = collection(dbOf(USERS.director), 'task_reports');
    await assertSucceeds(addDoc(reports, REPORT));
    await assertFails(addDoc(reports, { ...REPORT, createdBy: USERS.otroDirector.email }));
  });

  test('el autor agrega fotos pero no se califica a sí mismo', async () => {
    await seed({ 'task_reports/r1': REPORT });
    const report = doc(dbOf(USERS.director), 'task_reports/r1');
    await assertSucceeds(updateDoc(report, { images: [{ url: 'https://example.com/a.jpg' }], updatedAt: new Date() }));
    await assertFails(updateDoc(report, { rating: 5, status: 'rated' }));
  });

  test('califican el administrador y el secretario; otro director no toca el reporte', async () => {
    await seed({ 'task_reports/r1': REPORT });
    const rating = { rating: 4, ratingComment: 'Bien', ratedBy: 'x', ratedAt: new Date(), status: 'rated', updatedAt: new Date() };
    await assertFails(updateDoc(doc(dbOf(USERS.otroDirector), 'task_reports/r1'), rating));
    await assertFails(updateDoc(doc(dbOf(USERS.otroDirector), 'task_reports/r1'), { description: 'Alterado' }));
    await assertFails(updateDoc(doc(dbOf(USERS.secretario), 'task_reports/r1'), { description: 'Alterado' }));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.secretario), 'task_reports/r1'), rating));
    await assertSucceeds(updateDoc(doc(dbOf(USERS.admin), 'task_reports/r1'), { deleted: true }));
  });
});

describe('notificaciones', () => {
  const forDirector = { userId: USERS.director.uid, title: 'Aviso', body: 'Texto', read: false, createdAt: new Date() };

  test('cualquier usuario activo avisa a otro', async () => {
    await assertSucceeds(addDoc(collection(dbOf(USERS.secretario), 'notifications'), forDirector));
    await assertFails(addDoc(collection(dbOf(USERS.desactivado), 'notifications'), forDirector));
  });

  test('cada quien lee solo las suyas', async () => {
    await seed({ 'notifications/n1': forDirector });
    const mine = query(collection(dbOf(USERS.director), 'notifications'), where('userId', '==', USERS.director.uid));
    const result = await assertSucceeds(getDocs(mine));
    expect(result.size).toBe(1);
    await assertSucceeds(getDocs(query(mine, where('read', '==', false))));

    const ajenas = query(collection(dbOf(USERS.otroDirector), 'notifications'), where('userId', '==', USERS.director.uid));
    await assertFails(getDocs(ajenas));
    await assertFails(getDocs(collection(dbOf(USERS.otroDirector), 'notifications')));
  });

  test('solo el destinatario la marca como leída o eliminada, y no cambia su contenido', async () => {
    await seed({ 'notifications/n1': forDirector });
    const mine = doc(dbOf(USERS.director), 'notifications/n1');
    await assertSucceeds(updateDoc(mine, { read: true, readAt: new Date() }));
    await assertSucceeds(updateDoc(mine, { deleted: true, deletedAt: new Date() }));
    await assertFails(updateDoc(mine, { body: 'Otro texto' }));
    await assertFails(updateDoc(doc(dbOf(USERS.otroDirector), 'notifications/n1'), { read: true }));
    await assertFails(deleteDoc(mine));
  });
});

describe('tokens de push, organigrama y colecciones no declaradas', () => {
  test('cada dispositivo registra y da de baja su propio token', async () => {
    const token = { userId: USERS.director.uid, token: 'ExponentPushToken[abc]', platform: 'android' };
    const own = doc(dbOf(USERS.director), 'user_push_tokens/ExponentPushToken_abc_');
    await assertFails(setDoc(own, { ...token, userId: USERS.admin.uid }));
    await assertSucceeds(setDoc(own, token));
    // Otra persona inicia sesión en el mismo dispositivo: el token pasa a ser suyo
    await assertSucceeds(setDoc(doc(dbOf(USERS.otroDirector), 'user_push_tokens/ExponentPushToken_abc_'), { ...token, userId: USERS.otroDirector.uid }));
    await assertFails(getDoc(own));
    await assertFails(deleteDoc(own));
    await assertSucceeds(deleteDoc(doc(dbOf(USERS.otroDirector), 'user_push_tokens/ExponentPushToken_abc_')));
    await assertFails(getDocs(collection(dbOf(USERS.admin), 'user_push_tokens')));
  });

  test('el organigrama lo lee cualquiera y lo cambia el administrador', async () => {
    await seed({ 'metadata/orgStructure': { secretarias: [] } });
    await assertSucceeds(getDoc(doc(dbOf(USERS.director), 'metadata/orgStructure')));
    await assertFails(setDoc(doc(dbOf(USERS.secretario), 'metadata/orgStructure'), { secretarias: ['x'] }));
    await assertSucceeds(setDoc(doc(dbOf(USERS.admin), 'metadata/orgStructure'), { secretarias: ['x'] }));
  });

  test('una colección que no está en las reglas queda cerrada, también para el administrador', async () => {
    await assertFails(getDocs(collection(dbOf(USERS.admin), 'cualquier_otra')));
    await assertFails(setDoc(doc(dbOf(USERS.admin), 'cualquier_otra/x'), { a: 1 }));
  });
});
