// scripts/unificarCuentas.mjs
// Una sola cuenta por persona: cuando alguien tiene la cuenta de su puesto (genérica)
// y además una personal, se conserva la del puesto y la personal se desactiva.
//
// Preview (sin cambios):  node scripts/unificarCuentas.mjs
// Aplicar cambios:        node scripts/unificarCuentas.mjs --apply
//
// - No borra nada: la cuenta personal queda con active: false y replacedBy.
// - Todo se escribe en un solo batch. Respaldo fuera del repo (carpeta padre).
// - Se detiene sin cambios si alguna pareja no cuadra (cuenta inexistente, cuenta
//   del puesto inactiva o nombres que no parecen de la misma persona).

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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

const mail = (user) => `${user}@municipio.com`;

// [cuenta que se conserva, cuenta que se desactiva]
const PAREJAS = [
  [mail('secretaria.general'), mail('jaime.rosales')],
  [mail('desarrollo.economico'), mail('amalia.escalante')],
  [mail('pueblos.indigenas'), mail('anahi.catalan')],
  [mail('contraloria'), mail('marianne.chavez')],
  [mail('unidad.investigacion'), mail('juan.rivera')],
  [mail('transparencia'), mail('dulce.rosas')],
  [mail('mujeres'), mail('leidy.morgado')],
  [mail('sipinna'), mail('socorro.vargas')],
  [mail('juridico'), mail('efrain.magueyal')],
  [mail('asamblea'), mail('cinthya.alamilla')],
  // Misma persona con dos cuentas personales: se conserva la de su cargo vigente (Cuenta Pública)
  [mail('alejandro.diaz'), mail('alejandro.diaz.chavez')],
];

// Apellidos y nombres sin títulos ni acentos, para comprobar que es la misma persona
const TITULOS = new Set(['c', 'lic', 'ld', 'lc', 'ing', 'mtro', 'mtra', 'prof', 'tsu', 'lap', 'dr', 'dra']);
const palabras = (nombre) =>
  (nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p && !TITULOS.has(p));

const mismaPersona = (a, b) => {
  const pa = new Set(palabras(a));
  const comunes = palabras(b).filter(p => pa.has(p));
  return comunes.length >= 2;
};

async function main() {
  console.log(`Proyecto: ${firebaseConfig.projectId} — Modo: ${isApply ? 'APLICAR CAMBIOS' : 'PREVIEW (sin cambios)'}\n`);

  const snapshot = await getDocs(collection(db, 'users'));
  const byEmail = new Map(snapshot.docs.map(d => [(d.data().email || '').toLowerCase().trim(), { id: d.id, data: d.data() }]));

  const batch = writeBatch(db);
  const backup = [];
  const errores = [];
  const now = new Date();
  let ops = 0;

  for (const [conservar, desactivar] of PAREJAS) {
    const puesto = byEmail.get(conservar);
    const personal = byEmail.get(desactivar);

    if (!puesto) { errores.push(`No existe la cuenta a conservar: ${conservar}`); continue; }
    if (!personal) { errores.push(`No existe la cuenta a desactivar: ${desactivar}`); continue; }
    if (puesto.data.active === false) { errores.push(`La cuenta a conservar está inactiva: ${conservar}`); continue; }
    if (!mismaPersona(puesto.data.displayName, personal.data.displayName)) {
      errores.push(`Los nombres no coinciden: ${conservar} (${puesto.data.displayName}) / ${desactivar} (${personal.data.displayName})`);
      continue;
    }

    const yaInactiva = personal.data.active === false;
    console.log(`${yaInactiva ? '⏭️' : '✅'} ${puesto.data.displayName}`);
    console.log(`     conserva:   ${conservar}  [${puesto.data.role}] ${puesto.data.area || ''}`);
    console.log(`     desactiva:  ${desactivar}  [${personal.data.role}]${yaInactiva ? '  (ya estaba inactiva)' : ''}`);

    if (yaInactiva && personal.data.replacedBy === conservar) continue;
    backup.push({ id: personal.id, ...personal.data });
    batch.update(doc(db, 'users', personal.id), {
      active: false,
      replacedBy: conservar,
      deactivatedAt: now,
      updatedAt: now,
      updatedBy: 'script-unificar-cuentas',
    });
    ops++;
  }

  console.log(`\nOperaciones: ${ops}`);

  if (errores.length > 0) {
    console.log('\n❌ ERRORES — no se aplicó ningún cambio:');
    errores.forEach(e => console.log(`   - ${e}`));
    process.exit(1);
  }
  if (!isApply) {
    console.log('\n📋 MODO PREVIEW — no se realizó ningún cambio.');
    process.exit(0);
  }
  if (ops === 0) {
    console.log('\n✅ No hay cambios pendientes.');
    process.exit(0);
  }

  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const backupFile = path.join(outDir, `respaldo-usuarios-${now.toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n💾 Respaldo: ${backupFile}`);

  await batch.commit();
  console.log(`✅ ${ops} cuentas personales desactivadas.\n`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error general:', error);
  process.exit(1);
});
