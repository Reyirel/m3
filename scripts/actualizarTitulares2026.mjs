// scripts/actualizarTitulares2026.mjs
// Actualiza la colección users con el listado oficial de secretarios y directores
// (LISTADO DIRECCIONES.xlsx, octubre 2026).
//
// Preview (sin cambios):  node scripts/actualizarTitulares2026.mjs
// Aplicar cambios:        node scripts/actualizarTitulares2026.mjs --apply
//
// - No borra nada: los titulares que salen quedan con active: false.
// - Todo se escribe en un solo batch (o se aplica completo o no se aplica nada).
// - El respaldo y las contraseñas temporales se guardan FUERA del repo (carpeta padre).
// - Es idempotente: las cuentas que ya existen no se vuelven a crear.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { webcrypto, randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const isApply = process.argv.includes('--apply');

const firebaseConfig = {
  apiKey: "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "205062729291",
  appId: "1:205062729291:web:da314180f361bf2a3367ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const UPDATED_BY = 'script-actualizar-titulares-2026';
const mail = (user) => `${user}@municipio.com`;

// PBKDF2 — DEBE SER IGUAL AL DE utils/hashUtils.js (hashPassword)
const hashPassword = async (password, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${hex}`;
};

// Contraseña temporal sin caracteres ambiguos (0/O, 1/l/I)
const generarPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('');
};

// Direcciones por secretaría (igual que config/areas.js)
const SEC_GENERAL = 'Secretaría General Municipal';
const SEC_ECONOMICO = 'Secretaría de Desarrollo Económico y Turismo';
const SEC_PUEBLOS = 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas';
const SEC_OBRAS = 'Secretaría de Obras Públicas y Desarrollo Urbano';
const SEC_PLANEACION = 'Secretaría de Planeación y Evaluación';
const CONTRALORIA = 'Contraloría Municipal';
const DESPACHO = 'Despacho de la Presidencia';

const DIRECCIONES = {
  [SEC_GENERAL]: [
    'Dirección de Gobierno',
    'Conciliación Municipal',
    'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
    'Unidad Central de Correspondencia',
    'Oficial del Registro del Estado Familiar',
    'Dirección del Área Coordinadora de Archivo',
    'Dirección de Atención al Migrante',
    'Dirección de Recursos Materiales y Patrimonio',
    'Junta de Reclutamiento',
    'Coordinación de Agenda y Atención Ciudadana',
  ],
  [SEC_ECONOMICO]: [
    'Dirección de Turismo',
    'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
    'Dirección de Desarrollo Económico',
  ],
  [SEC_PUEBLOS]: [],
};

const DIR_MEDIO_AMBIENTE = 'Dirección de Medio Ambiente y Desarrollo Sostenible';
const DIR_PLANEACION = 'Dirección de Planeación y Evaluación';
const DIR_SUBSTANCIACION = 'Dirección de la Unidad de Substanciación';
const UNIDAD_TRANSPARENCIA = 'Unidad Municipal de Transparencia y Acceso a la Información';

// Campos de organigrama que hereda una cuenta nueva del titular anterior
const CAMPOS_ORG = ['area', 'department', 'secretaria', 'position', 'cargo', 'secretarioEmail', 'areasPermitidas', 'direcciones'];

const secretarioFields = (secretaria, cargo) => ({
  role: 'secretario',
  area: secretaria,
  department: secretaria,
  secretaria,
  cargo,
  position: cargo,
  secretarioEmail: null,
  direcciones: DIRECCIONES[secretaria],
  areasPermitidas: [secretaria, ...DIRECCIONES[secretaria]],
});

const directorFields = (secretaria, secretarioEmail, cargo, direccion) => ({
  area: secretaria,
  department: secretaria,
  secretaria,
  cargo,
  position: cargo,
  secretarioEmail,
  areasPermitidas: [direccion],
});

// ───────────────────────────── CUENTAS NUEVAS ─────────────────────────────
// copyFrom: hereda los campos de organigrama de esa cuenta (titular anterior)
const CREAR = [
  { email: mail('danny.cerrito'), displayName: 'DANNY CERRITO HERNÁNDEZ', copyFrom: mail('alfonso.alavez') },
  { email: mail('cristian.labra'), displayName: 'CRISTIAN JESÚS LABRA OLGUÍN', copyFrom: mail('adrian.hernandez') },
  { email: mail('luis.gonzalez'), displayName: 'LUIS ALBERTO GONZÁLEZ ORTIZ', copyFrom: mail('jose.angeles') },
  { email: mail('moises.vaquero'), displayName: 'MOISÉS VAQUERO DURAZNO', copyFrom: mail('rosalio.romero') },
  { email: mail('victor.martinez'), displayName: 'VÍCTOR MARTÍNEZ', copyFrom: mail('ernesto.espinoza') },
  { email: mail('juan.rivera'), displayName: 'JUAN MANUEL RIVERA ORIA', copyFrom: mail('unidad.investigacion') },
  { email: mail('juana.cruz'), displayName: 'JUANA IDALIA CRUZ CRUZ', copyFrom: mail('miguel.hernandez') },
  { email: mail('giovanna.cecilio'), displayName: 'GIOVANNA CECILIO ORTIZ', copyFrom: mail('dulce.rosas') },
  // Deja la Secretaría General y pasa a Secretario Técnico del Despacho
  { email: mail('jose.zuniga'), displayName: 'JOSÉ MANUEL ZÚÑIGA GUERRERO', copyFrom: mail('jaime.rosales') },
  {
    email: mail('gerardo.mendoza'),
    displayName: 'GERARDO MENDOZA ROMERO',
    fields: directorFields(SEC_GENERAL, mail('secretaria.general'), 'Secretario Técnico', 'Dirección de Reglamentos, Comercio, Mercado y Espectáculos'),
  },
  {
    email: mail('karla.montiel'),
    displayName: 'KARLA AMAIRANI MONTIEL PAREDES',
    fields: directorFields(SEC_OBRAS, mail('obras.publicas'), 'Director de Medio Ambiente y Desarrollo Sostenible', DIR_MEDIO_AMBIENTE),
  },
  {
    email: mail('elisandra.cabanas'),
    displayName: 'ELISANDRA CABAÑAS REYES',
    fields: directorFields(SEC_PLANEACION, mail('planeacion'), 'Director de Planeación y Evaluación', DIR_PLANEACION),
  },
  {
    email: mail('juan.zapote'),
    displayName: 'JUAN CARLOS ZAPOTE LÓPEZ',
    fields: directorFields(CONTRALORIA, mail('contraloria'), 'Director de la Unidad de Substanciación', DIR_SUBSTANCIACION),
  },
];

// ───────────────────────────── ACTUALIZACIONES ─────────────────────────────
// union: valores que se agregan a un arreglo sin quitar los existentes
const ACTUALIZAR = [
  // Cuentas genéricas: cambia el titular, la cuenta sigue activa
  { email: mail('unidad.investigacion'), fields: { displayName: 'JUAN MANUEL RIVERA ORIA' } },
  { email: mail('transparencia'), fields: { displayName: 'DULCE ANNET ROSAS ROJO' } },
  { email: mail('mujeres'), fields: { displayName: 'LEIDY MORGADO ORTEGA' } },
  { email: mail('secretaria.general'), fields: { displayName: 'JAIME ALDRIN ROSALES AZUARA' } },
  { email: mail('desarrollo.economico'), fields: { displayName: 'AMALIA ESCALANTE CRUZ' } },
  { email: mail('pueblos.indigenas'), fields: { displayName: 'ANAHÍ CATALÁN LEGORRETA' } },

  // Cuentas personales de los nuevos secretarios
  { email: mail('jaime.rosales'), fields: secretarioFields(SEC_GENERAL, 'Secretario General Municipal') },
  { email: mail('amalia.escalante'), fields: secretarioFields(SEC_ECONOMICO, 'Secretario de Desarrollo Económico y Turismo') },
  { email: mail('anahi.catalan'), fields: secretarioFields(SEC_PUEBLOS, 'Secretario de Desarrollo para Pueblos y Comunidades Indígenas') },

  // Cambios de cargo
  {
    email: mail('dulce.rosas'),
    fields: {
      ...directorFields(CONTRALORIA, mail('contraloria'), 'Titular de la Unidad Municipal de Transparencia', UNIDAD_TRANSPARENCIA),
      area: UNIDAD_TRANSPARENCIA,
    },
  },
  {
    email: 'aquinojcazul@gmail.com',
    fields: directorFields(SEC_GENERAL, mail('secretaria.general'), 'Secretario Técnico', SEC_GENERAL),
  },
  {
    // Sigue siendo admin: solo cambia el cargo
    email: mail('brenda.martinez'),
    fields: {
      cargo: 'Secretario Particular y Relaciones Públicas',
      position: 'Secretario Particular y Relaciones Públicas',
      area: DESPACHO,
      department: DESPACHO,
      areasPermitidas: ['Secretaría Particular y Relaciones Públicas'],
    },
  },

  // Direcciones nuevas visibles para su secretario
  { email: mail('planeacion'), union: { direcciones: [DIR_PLANEACION], areasPermitidas: [DIR_PLANEACION] } },
  // La Contraloría no tenía arreglos: se incluye su propia área para no perder el acceso que ya tenía
  {
    email: mail('contraloria'),
    union: {
      direcciones: ['Dirección de la Unidad de Investigación', UNIDAD_TRANSPARENCIA, DIR_SUBSTANCIACION],
      areasPermitidas: [CONTRALORIA, 'Dirección de la Unidad de Investigación', UNIDAD_TRANSPARENCIA, DIR_SUBSTANCIACION],
    },
  },
];

// ───────────────────────────── DESACTIVAR ─────────────────────────────
const DESACTIVAR = [
  { email: mail('alfonso.alavez'), replacedBy: mail('danny.cerrito') },
  { email: mail('adrian.hernandez'), replacedBy: mail('cristian.labra') },
  { email: mail('jose.angeles'), replacedBy: mail('luis.gonzalez') },
  { email: mail('rosalio.romero'), replacedBy: mail('moises.vaquero') },
  { email: mail('ernesto.espinoza'), replacedBy: mail('victor.martinez') },
  { email: mail('miguel.hernandez'), replacedBy: mail('juana.cruz') },
  { email: mail('gisela.trejo'), replacedBy: mail('leidy.morgado') },
  { email: mail('janna.padre'), replacedBy: mail('dulce.rosas') },
  { email: mail('lucila.ocampo'), replacedBy: mail('amalia.escalante') },
];

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function main() {
  console.log('='.repeat(70));
  console.log('ACTUALIZACIÓN DE TITULARES (secretarios y directores)');
  console.log(`Proyecto: ${firebaseConfig.projectId}`);
  console.log(`Modo: ${isApply ? 'APLICAR CAMBIOS' : 'PREVIEW (sin cambios)'}`);
  console.log('='.repeat(70));

  const snapshot = await getDocs(collection(db, 'users'));
  const byEmail = new Map();
  snapshot.docs.forEach(d => {
    const email = (d.data().email || '').toLowerCase().trim();
    if (byEmail.has(email)) console.log(`⚠️ Correo duplicado en users: ${email}`);
    byEmail.set(email, { id: d.id, data: d.data() });
  });
  console.log(`\n📋 ${snapshot.size} usuarios en Firestore\n`);

  const batch = writeBatch(db);
  const backup = [];
  const credenciales = [];
  const errores = [];
  const now = new Date();
  let ops = 0;

  // 1) Cuentas nuevas
  console.log('➕ CUENTAS NUEVAS');
  for (const nuevo of CREAR) {
    if (byEmail.has(nuevo.email)) {
      console.log(`   ⏭️ ${nuevo.email} ya existe, se omite`);
      continue;
    }
    let orgFields = nuevo.fields;
    if (nuevo.copyFrom) {
      const origen = byEmail.get(nuevo.copyFrom);
      if (!origen) {
        errores.push(`No existe la cuenta origen ${nuevo.copyFrom} para crear ${nuevo.email}`);
        continue;
      }
      orgFields = {};
      CAMPOS_ORG.forEach(k => {
        if (origen.data[k] !== undefined) orgFields[k] = origen.data[k];
      });
    }
    const password = generarPassword();
    const data = {
      email: nuevo.email,
      password: await hashPassword(password, nuevo.email),
      displayName: nuevo.displayName,
      role: 'director',
      ...orgFields,
      phone: '',
      active: true,
      createdAt: now,
      updatedAt: now,
      updatedBy: UPDATED_BY,
      ...(nuevo.copyFrom ? { transferredFrom: nuevo.copyFrom, transferDate: now } : {}),
    };
    batch.set(doc(collection(db, 'users')), data);
    ops++;
    credenciales.push({ nombre: nuevo.displayName, email: nuevo.email, password, cargo: data.cargo || data.position || '' });
    console.log(`   ✅ ${nuevo.displayName} <${nuevo.email}> — ${data.cargo || data.position} (${data.area})`);
  }

  // 2) Actualizaciones
  console.log('\n🔄 ACTUALIZACIONES');
  for (const cambio of ACTUALIZAR) {
    const actual = byEmail.get(cambio.email);
    if (!actual) {
      errores.push(`No existe la cuenta ${cambio.email} para actualizar`);
      continue;
    }
    const fields = { ...(cambio.fields || {}) };
    Object.entries(cambio.union || {}).forEach(([k, valores]) => {
      fields[k] = [...new Set([...(actual.data[k] || []), ...valores])];
    });
    const diff = Object.entries(fields).filter(([k, v]) => !sameValue(actual.data[k], v));
    if (diff.length === 0) {
      console.log(`   ⏭️ ${cambio.email} ya está actualizado`);
      continue;
    }
    backup.push({ id: actual.id, ...actual.data });
    batch.update(doc(db, 'users', actual.id), { ...Object.fromEntries(diff), updatedAt: now, updatedBy: UPDATED_BY });
    ops++;
    console.log(`   ✅ ${cambio.email}`);
    diff.forEach(([k, v]) => console.log(`        ${k}: ${JSON.stringify(actual.data[k] ?? null)} → ${JSON.stringify(v)}`));
  }

  // 3) Desactivar titulares que salen
  console.log('\n⛔ DESACTIVAR');
  for (const baja of DESACTIVAR) {
    const actual = byEmail.get(baja.email);
    if (!actual) {
      errores.push(`No existe la cuenta ${baja.email} para desactivar`);
      continue;
    }
    if (actual.data.active === false) {
      console.log(`   ⏭️ ${baja.email} ya está inactiva`);
      continue;
    }
    backup.push({ id: actual.id, ...actual.data });
    batch.update(doc(db, 'users', actual.id), {
      active: false,
      replacedBy: baja.replacedBy,
      deactivatedAt: now,
      updatedAt: now,
      updatedBy: UPDATED_BY,
    });
    ops++;
    console.log(`   ✅ ${actual.data.displayName} <${baja.email}> → reemplazado por ${baja.replacedBy}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Operaciones: ${ops} (cuentas nuevas: ${credenciales.length})`);

  if (errores.length > 0) {
    console.log('\n❌ ERRORES — no se aplicó ningún cambio:');
    errores.forEach(e => console.log(`   - ${e}`));
    process.exit(1);
  }
  if (!isApply) {
    console.log('\n📋 MODO PREVIEW — no se realizó ningún cambio.');
    console.log('   Para aplicar: node scripts/actualizarTitulares2026.mjs --apply\n');
    process.exit(0);
  }
  if (ops === 0) {
    console.log('\n✅ No hay cambios pendientes.\n');
    process.exit(0);
  }

  // Respaldo y credenciales fuera del repo, antes de escribir en Firestore
  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(outDir, `respaldo-usuarios-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n💾 Respaldo: ${backupFile}`);

  if (credenciales.length > 0) {
    const credFile = path.join(outDir, `credenciales-nuevos-titulares-${stamp}.txt`);
    const lineas = credenciales.map(c => `${c.nombre}\n  Cargo: ${c.cargo}\n  Usuario: ${c.email}\n  Contraseña temporal: ${c.password}\n`);
    fs.writeFileSync(credFile, `CREDENCIALES TEMPORALES — ${now.toLocaleString('es-MX')}\n\n${lineas.join('\n')}`);
    console.log(`🔐 Credenciales: ${credFile}`);
  }

  await batch.commit();
  console.log(`\n✅ ${ops} operaciones aplicadas en Firestore.\n`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error general:', error);
  process.exit(1);
});
