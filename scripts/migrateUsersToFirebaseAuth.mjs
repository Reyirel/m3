// migrateUsersToFirebaseAuth.mjs
// Migra los usuarios de la colección `users` a Firebase Auth conservando el uid
// (= id del documento) y, cuando el formato del hash lo permite, la contraseña.
//
// Requisitos:
//   npm install --no-save firebase-admin
//   GOOGLE_APPLICATION_CREDENTIALS=<ruta a la cuenta de servicio .json>
//
// Uso:
//   node scripts/migrateUsersToFirebaseAuth.mjs                  → simulación, no escribe nada
//   node scripts/migrateUsersToFirebaseAuth.mjs --apply          → importa pbkdf2 y sha256
//   node scripts/migrateUsersToFirebaseAuth.mjs --apply --only=correo@dominio.com
//   node scripts/migrateUsersToFirebaseAuth.mjs --apply --reset-legacy
//        → además crea las cuentas con hash antiguo usando una contraseña temporal
//          y las guarda en migracion-contrasenas-temporales.csv
//   node scripts/migrateUsersToFirebaseAuth.mjs --apply --strip-hashes
//        → borra `password` y `tempPassword` de los documentos ya migrados
//
// Formatos de hash (ver utils/hashUtils.js):
//   pbkdf2:<hex>  → se importa tal cual (PBKDF2-SHA256, 100000 iteraciones, sal = email)
//   sha256:<hex>  → se importa tal cual (SHA-256 de contraseña + email)
//   sin prefijo   → hash de 32 bits, no importable: requiere contraseña nueva

import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESET_LEGACY = args.includes('--reset-legacy');
const STRIP_HASHES = args.includes('--strip-hashes');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice('--only='.length).toLowerCase();
const TEMP_PASSWORDS_FILE = 'migracion-contrasenas-temporales.csv';

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const auth = admin.auth();

const normalizeEmail = (email) => (email || '').replace(/[^a-zA-Z0-9@._\-+]/g, '').toLowerCase();

const hashFormat = (hash) => {
  if (typeof hash !== 'string' || !hash) return 'none';
  if (hash.startsWith('pbkdf2:')) return 'pbkdf2';
  if (hash.startsWith('sha256:')) return 'sha256';
  return 'legacy';
};

const authUserExists = async (uid) => {
  try {
    await auth.getUser(uid);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return false;
    throw error;
  }
};

const emailTakenByOtherUid = async (email, uid) => {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid !== uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return false;
    throw error;
  }
};

const importBatch = async (records, hash, label) => {
  for (let i = 0; i < records.length; i += 1000) {
    const chunk = records.slice(i, i + 1000);
    const result = await auth.importUsers(chunk, { hash });
    console.log(`  ${label}: ${result.successCount} importados, ${result.failureCount} con error`);
    result.errors.forEach(e => console.log(`    ✗ ${chunk[e.index].email}: ${e.error.message}`));
  }
};

const snapshot = await db.collection('users').get();
const pbkdf2 = [];
const sha256 = [];
const legacy = [];
const alreadyMigrated = [];
const skipped = [];
const seenEmails = new Map();

for (const docSnap of snapshot.docs) {
  const data = docSnap.data();
  const email = normalizeEmail(data.email);
  if (ONLY && email !== ONLY) continue;

  if (!email) {
    skipped.push(`${docSnap.id}: sin email`);
    continue;
  }
  if (seenEmails.has(email)) {
    skipped.push(`${docSnap.id}: email duplicado (${email}), ya lo usa ${seenEmails.get(email)}`);
    continue;
  }
  seenEmails.set(email, docSnap.id);

  if (await authUserExists(docSnap.id)) {
    alreadyMigrated.push(docSnap.id);
    continue;
  }
  if (await emailTakenByOtherUid(email, docSnap.id)) {
    skipped.push(`${docSnap.id}: ${email} ya existe en Firebase Auth con otro uid`);
    continue;
  }

  const base = {
    uid: docSnap.id,
    email,
    displayName: data.displayName || undefined,
    disabled: data.active === false,
  };

  const format = hashFormat(data.password);
  if (format === 'pbkdf2') {
    pbkdf2.push({
      ...base,
      passwordHash: Buffer.from(data.password.slice('pbkdf2:'.length), 'hex'),
      passwordSalt: Buffer.from(email, 'utf8'),
    });
  } else if (format === 'sha256') {
    sha256.push({
      ...base,
      passwordHash: Buffer.from(data.password.slice('sha256:'.length), 'hex'),
      passwordSalt: Buffer.from(email, 'utf8'),
    });
  } else {
    legacy.push(base);
  }
}

console.log(`Usuarios en Firestore: ${snapshot.size}`);
console.log(`  Ya migrados:                 ${alreadyMigrated.length}`);
console.log(`  Importables (pbkdf2):        ${pbkdf2.length}`);
console.log(`  Importables (sha256):        ${sha256.length}`);
console.log(`  Requieren contraseña nueva:  ${legacy.length}`);
legacy.forEach(u => console.log(`    - ${u.email}`));
console.log(`  Omitidos:                    ${skipped.length}`);
skipped.forEach(s => console.log(`    - ${s}`));

if (!APPLY) {
  console.log('\nSimulación: no se escribió nada. Agrega --apply para ejecutar.');
  process.exit(0);
}

if (pbkdf2.length > 0) {
  await importBatch(pbkdf2, { algorithm: 'PBKDF2_SHA256', rounds: 100000 }, 'pbkdf2');
}
if (sha256.length > 0) {
  // hashUtils.sha256Hash calcula SHA-256(contraseña + email)
  await importBatch(sha256, { algorithm: 'SHA256', rounds: 1, inputOrder: 'PASSWORD_FIRST' }, 'sha256');
}

if (RESET_LEGACY && legacy.length > 0) {
  const rows = ['email,contrasena_temporal'];
  for (const user of legacy) {
    const password = randomBytes(9).toString('base64url');
    try {
      await auth.createUser({ ...user, password });
      rows.push(`${user.email},${password}`);
    } catch (error) {
      console.log(`    ✗ ${user.email}: ${error.message}`);
    }
  }
  writeFileSync(TEMP_PASSWORDS_FILE, rows.join('\n') + '\n');
  console.log(`  Contraseñas temporales guardadas en ${TEMP_PASSWORDS_FILE} (${rows.length - 1} usuarios).`);
  console.log('  Entrégalas por un canal seguro y borra el archivo.');
} else if (legacy.length > 0) {
  console.log(`  ${legacy.length} usuarios con hash antiguo siguen sin cuenta en Firebase Auth (usa --reset-legacy).`);
}

if (STRIP_HASHES) {
  let stripped = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (ONLY && normalizeEmail(data.email) !== ONLY) continue;
    if (data.password === undefined && data.tempPassword === undefined) continue;
    if (!(await authUserExists(docSnap.id))) continue;
    await docSnap.ref.update({
      password: admin.firestore.FieldValue.delete(),
      tempPassword: admin.firestore.FieldValue.delete(),
    });
    stripped++;
  }
  console.log(`  Hashes y contraseñas en texto plano borrados de ${stripped} documentos.`);
}

console.log('\nListo.');
