// sincronizarConListado.mjs
// Pone la colección `users` de acuerdo con el listado oficial de secretarios y directores
// (el Excel de Recursos Humanos). El Excel manda: es lo más nuevo.
//
// El listado NO se guarda en el repositorio (trae RFC y CURP). Este script lo lee al
// ejecutarse y solo usa tres columnas: nombre, departamento y puesto.
//
// Uso:
//   node scripts/sincronizarConListado.mjs                     → solo muestra las diferencias
//   node scripts/sincronizarConListado.mjs --apply             → actualiza las cuentas del listado
//   node scripts/sincronizarConListado.mjs --borrar-inactivas  → borra las cuentas ya desactivadas
//   node scripts/sincronizarConListado.mjs --fuera=borrar      → borra las cuentas activas que no
//   node scripts/sincronizarConListado.mjs --fuera=desactivar    están en el listado (nunca un admin)
//   --listado="ruta/al/archivo.xlsx"   (por omisión: nuevas direcciones/LISTADO DIRECCIONES.xlsx)
//
// Antes de escribir guarda una copia completa de `users` en data/ (carpeta que git ignora).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import xlsx from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { SECRETARIAS_DIRECCIONES, resolveAreaName } from '../config/areas.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const APPLY = flag('apply');
const DELETE_INACTIVE = flag('borrar-inactivas');
const OUTSIDE = option('fuera'); // '' | 'borrar' | 'desactivar'
const LISTADO = option('listado') || 'nuevas direcciones/LISTADO DIRECCIONES.xlsx';
const UPDATED_BY = 'script-sincronizar-listado';

if (OUTSIDE && !['borrar', 'desactivar'].includes(OUTSIDE)) {
  console.error('--fuera debe ser "borrar" o "desactivar"');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'infra-sublime-464215-m5.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'infra-sublime-464215-m5',
};
const db = getFirestore(initializeApp(firebaseConfig));

// ───────────────────────── Organigrama: clave de departamento → área ─────────────────────────
const DESPACHO = 'Despacho de la Presidencia';
const CONTRALORIA = 'Contraloría Municipal';
const SEC_GENERAL = 'Secretaría General Municipal';
const SEC_TESORERIA = 'Secretaría de Tesorería Municipal';
const SEC_OBRAS = 'Secretaría de Obras Públicas y Desarrollo Urbano';
const SEC_PLANEACION = 'Secretaría de Planeación y Evaluación';
const SEC_ECONOMICO = 'Secretaría de Desarrollo Económico y Turismo';
const SEC_BIENESTAR = 'Secretaría de Bienestar Social';
const SEC_PUEBLOS = 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas';

// Departamentos que son la secretaría misma: su titular es el secretario
const SECRETARIA_HEADS = {
  3001: { secretaria: SEC_GENERAL, position: 'Secretario General Municipal' },
  4000: { secretaria: SEC_TESORERIA, position: 'Secretario de Tesorería Municipal' },
  5001: { secretaria: SEC_OBRAS, position: 'Secretario de Obras Públicas y Desarrollo Urbano' },
  6001: { secretaria: SEC_PLANEACION, position: 'Secretario de Planeación y Evaluación' },
  7001: { secretaria: SEC_ECONOMICO, position: 'Secretario de Desarrollo Económico y Turismo' },
  8001: { secretaria: SEC_BIENESTAR, position: 'Secretario de Bienestar Social' },
  10001: { secretaria: SEC_PUEBLOS, position: 'Secretario de Desarrollo para Pueblos y Comunidades Indígenas' },
};

// Departamentos que son una dirección o unidad
const UNITS = {
  1003: { secretaria: DESPACHO, unit: 'Dirección Jurídica', position: 'Director Jurídico' },
  1004: { secretaria: DESPACHO, unit: 'Instancia Municipal para el Desarrollo de las Mujeres', position: 'Titular de la Instancia Municipal para el Desarrollo de las Mujeres' },
  1005: { secretaria: DESPACHO, unit: 'Dirección de Comunicación Social y Marketing Digital', position: 'Director de Comunicación Social y Marketing Digital' },
  1006: { secretaria: DESPACHO, unit: 'Secretaría Ejecutiva de SIPINNA', position: 'Titular de la Secretaría Ejecutiva de SIPINNA' },
  3005: { secretaria: SEC_GENERAL, unit: 'Dirección de Reglamentos, Comercio, Mercado y Espectáculos', position: 'Director de Reglamentos, Comercio, Mercado y Espectáculos' },
  3006: { secretaria: SEC_GENERAL, unit: 'Unidad Central de Correspondencia', position: 'Titular de la Unidad Central de Correspondencia' },
  3010: { secretaria: SEC_GENERAL, unit: 'Dirección del Área Coordinadora de Archivo', position: 'Director del Área Coordinadora de Archivo' },
  3012: { secretaria: SEC_GENERAL, unit: 'Dirección de Recursos Materiales y Patrimonio', position: 'Director de Recursos Materiales y Patrimonio' },
  4002: { secretaria: SEC_TESORERIA, unit: 'Dirección de Administración', position: 'Director de Administración' },
  4003: { secretaria: SEC_TESORERIA, unit: 'Dirección de Catastro', position: 'Director de Catastro' },
  4004: { secretaria: SEC_TESORERIA, unit: 'Dirección de Cuenta Pública', position: 'Director de Cuenta Pública' },
  4005: { secretaria: SEC_TESORERIA, unit: 'Dirección de Control y Seguimiento de Egresos', position: 'Director de Control y Seguimiento de Egresos' },
  4006: { secretaria: SEC_TESORERIA, unit: 'Dirección de Ingresos y Estrategias de Recaudación', position: 'Director de Ingresos y Estrategias de Recaudación' },
  4007: { secretaria: SEC_TESORERIA, unit: 'Dirección de Recursos Humanos y Nómina', position: 'Director de Recursos Humanos y Nómina' },
  5002: { secretaria: SEC_OBRAS, unit: 'Dirección de Obras Públicas', position: 'Director de Obras Públicas' },
  5007: { secretaria: SEC_OBRAS, unit: 'Dirección de Desarrollo Urbano y Ordenamiento Territorial', position: 'Director de Desarrollo Urbano y Ordenamiento Territorial' },
  5010: { secretaria: SEC_OBRAS, unit: 'Dirección de Medio Ambiente y Desarrollo Sostenible', position: 'Director de Medio Ambiente y Desarrollo Sostenible' },
  5011: { secretaria: SEC_OBRAS, unit: 'Dirección de Servicios Públicos y Limpias', position: 'Director de Servicios Públicos y Limpias' },
  5017: { secretaria: SEC_OBRAS, unit: 'Dirección de Servicios Municipales', position: 'Director de Servicios Municipales' },
  6005: { secretaria: SEC_PLANEACION, unit: 'Dirección de Tecnologías de la Información', position: 'Director de Tecnologías de la Información' },
  6006: { secretaria: SEC_PLANEACION, unit: 'Dirección de Planeación y Evaluación', position: 'Director de Planeación y Evaluación' },
  7002: { secretaria: SEC_ECONOMICO, unit: 'Dirección de Turismo', position: 'Director de Turismo' },
  7003: { secretaria: SEC_ECONOMICO, unit: 'Dirección de Desarrollo Agropecuario y Proyectos Productivos', position: 'Director de Desarrollo Agropecuario y Proyectos Productivos' },
  7005: { secretaria: SEC_ECONOMICO, unit: 'Dirección de Desarrollo Económico', position: 'Director de Desarrollo Económico' },
  8003: { secretaria: SEC_BIENESTAR, unit: 'Dirección de Salud', position: 'Director de Salud' },
  8004: { secretaria: SEC_BIENESTAR, unit: 'Dirección de Educación', position: 'Director de Educación' },
  8005: { secretaria: SEC_BIENESTAR, unit: 'Dirección del Deporte', position: 'Director del Deporte' },
  8006: { secretaria: SEC_BIENESTAR, unit: 'Dirección de Cultura', position: 'Director de Cultura' },
  8010: { secretaria: SEC_BIENESTAR, unit: 'Dirección de Programas Sociales', position: 'Director de Programas Sociales' },
  8011: { secretaria: SEC_BIENESTAR, unit: 'Instancia Municipal de la Juventud', position: 'Titular de la Instancia Municipal de la Juventud' },
};

// Departamentos con varios puestos: se distinguen por el texto del puesto
const BY_PUESTO = {
  1001: [
    // Responde por el Despacho completo y por su propia unidad: sin esto, una tarea
    // dirigida a "Despacho de la Presidencia" se quedaba sin responsable
    [/SECRETARIO TECNICO/, { secretaria: DESPACHO, unit: 'Secretario Técnico', units: [DESPACHO, 'Secretario Técnico'], position: 'Secretario Técnico' }],
    [/SECRETARIO PARTICULAR/, { secretaria: DESPACHO, unit: 'Secretaría Particular y Relaciones Públicas', position: 'Secretario Particular y Relaciones Públicas' }],
    [/LOGISTICA/, { secretaria: DESPACHO, unit: 'Dirección de Logística y Eventos', position: 'Director de Logística, Organización y Eventos' }],
    [/AUDIENCIAS/, { secretaria: DESPACHO, unit: 'Dirección de Audiencias y Atención Ciudadana', position: 'Director de Audiencias y Atención Ciudadana' }],
  ],
  1002: [
    [/TRANS/, { secretaria: CONTRALORIA, unit: 'Unidad Municipal de Transparencia y Acceso a la Información', position: 'Titular de la Unidad Municipal de Transparencia' }],
    [/SUBST/, { secretaria: CONTRALORIA, unit: 'Dirección de la Unidad de Substanciación', position: 'Director de la Unidad de Substanciación' }],
    [/INVESTIG/, { secretaria: CONTRALORIA, unit: 'Dirección de la Unidad de Investigación', position: 'Director de la Unidad de Investigación' }],
  ],
  3001: [
    [/DIRECTOR DE GOBIERNO/, { secretaria: SEC_GENERAL, unit: 'Dirección de Gobierno', position: 'Director de Gobierno' }],
  ],
};

const plain = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Títulos que anteceden al nombre en `displayName` ("LIC.", "MTRO.", "C.")
const TITLES = new Set(['C', 'LIC', 'LICDA', 'MTRO', 'MTRA', 'ING', 'LD', 'TSU', 'LC', 'LAP', 'DR', 'DRA', 'PROFR', 'PROFRA', 'ARQ']);
const nameKey = (name) => {
  const tokens = plain(name).split(' ').filter(Boolean);
  while (tokens.length > 1 && tokens[0].endsWith('.') && TITLES.has(tokens[0].slice(0, -1))) tokens.shift();
  return tokens.join(' ');
};

/** Qué le corresponde a una fila del listado: { kind, secretaria, unit?, position } o null */
const assignmentFor = (deptCode, puesto) => {
  const p = plain(puesto);
  const isTecnico = /SECRETARIO TECNICO/.test(p);
  const special = (BY_PUESTO[deptCode] || []).find(([pattern]) => pattern.test(p));
  if (special) return { kind: 'director', ...special[1] };

  const head = SECRETARIA_HEADS[deptCode];
  if (head) {
    // El secretario técnico de una secretaría no es su titular: se le trata como director
    // con la secretaría completa a su cargo (mismo criterio que actualizarTitulares2026)
    if (isTecnico) return { kind: 'director', secretaria: head.secretaria, unit: head.secretaria, position: 'Secretario Técnico' };
    if (/^SECRETARIO/.test(p)) return { kind: 'secretario', ...head };
    return null;
  }

  const unit = UNITS[deptCode];
  if (unit) return { kind: 'director', ...unit, ...(isTecnico ? { position: 'Secretario Técnico' } : {}) };
  return null;
};

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const canonical = (area) => resolveAreaName(String(area || '').trim());

/** Campos que debe tener la cuenta según el listado (solo los que hay que cambiar) */
const desiredFields = (user, assignment) => {
  const { kind, secretaria, unit, units, position } = assignment;
  const fields = { position, cargo: position, secretaria };

  if (kind === 'secretario') {
    const direcciones = SECRETARIAS_DIRECCIONES[secretaria] || [];
    Object.assign(fields, {
      area: secretaria,
      department: secretaria,
      direcciones,
      areasPermitidas: [secretaria, ...direcciones],
    });
  } else {
    fields.areasPermitidas = units || [unit];
    // El área se respeta si ya es su secretaría o su unidad (solo se corrige el nombre
    // cuando está escrito con una variante); cualquier otra cosa pasa a ser la secretaría
    const current = canonical(user.area);
    fields.area = current === secretaria || current === unit ? current : secretaria;
    if (!user.department || canonical(user.department) !== user.department) {
      fields.department = canonical(user.department) || secretaria;
    }
  }
  return Object.fromEntries(Object.entries(fields).filter(([key, value]) => !sameValue(user[key], value)));
};

async function main() {
  console.log('='.repeat(72));
  console.log('SINCRONIZAR USUARIOS CON EL LISTADO');
  console.log(`Proyecto: ${firebaseConfig.projectId}`);
  console.log(`Listado:  ${LISTADO}`);
  const mode = [APPLY && 'actualizar', DELETE_INACTIVE && 'borrar inactivas', OUTSIDE && `fuera del listado: ${OUTSIDE}`].filter(Boolean);
  console.log(`Modo:     ${mode.length ? mode.join(' + ') : 'SOLO MOSTRAR (no cambia nada)'}`);
  console.log('='.repeat(72));

  // ── Listado
  const sheet = xlsx.readFile(LISTADO);
  const rows = xlsx.utils.sheet_to_json(sheet.Sheets[sheet.SheetNames[0]], { defval: '' });
  const people = rows
    .map((row) => {
      const get = (prefix) => {
        const key = Object.keys(row).find((k) => plain(k).startsWith(prefix));
        return key ? String(row[key]).trim() : '';
      };
      const departamento = get('DEPARTAMENTO');
      return {
        name: get('NOMBRE'),
        departamento,
        puesto: get('PUESTO'),
        deptCode: Number((departamento.match(/^\s*(\d+)/) || [])[1]),
      };
    })
    .filter((person) => person.name);
  console.log(`\nPersonas en el listado: ${people.length}`);

  // ── Usuarios
  const snapshot = await getDocs(collection(db, 'users'));
  const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const active = users.filter((u) => u.active !== false);
  const inactive = users.filter((u) => u.active === false);
  console.log(`Usuarios en la base de datos: ${users.length} (${active.length} activos, ${inactive.length} inactivos)\n`);

  // ── Cruce por nombre
  const updates = [];
  const matchedIds = new Set();
  const problems = [];
  console.log('CUENTAS DEL LISTADO');
  for (const person of people) {
    const key = nameKey(person.name);
    const matches = active.filter((u) => nameKey(u.displayName) === key);
    const assignment = assignmentFor(person.deptCode, person.puesto);
    if (!assignment) {
      problems.push(`No sé a qué área corresponde: ${person.name} — ${person.departamento} / ${person.puesto}`);
      continue;
    }
    if (matches.length === 0) {
      problems.push(`SIN CUENTA ACTIVA: ${person.name} — ${assignment.position} (${assignment.unit || assignment.secretaria})`);
      continue;
    }
    if (matches.length > 1) {
      problems.push(`VARIAS CUENTAS ACTIVAS para ${person.name}: ${matches.map((u) => u.email).join(', ')}`);
      matches.forEach((u) => matchedIds.add(u.id));
      continue;
    }
    const user = matches[0];
    matchedIds.add(user.id);
    if (assignment.kind === 'secretario' && user.role !== 'secretario') {
      problems.push(`${user.email} figura como ${assignment.position} en el listado pero su rol es "${user.role}"`);
    }
    const fields = desiredFields(user, assignment);
    if (Object.keys(fields).length === 0) continue;
    updates.push({ user, fields });
    console.log(`  ✏️  ${user.email} — ${user.displayName}`);
    Object.entries(fields).forEach(([k, v]) => console.log(`        ${k}: ${JSON.stringify(user[k] ?? null)} → ${JSON.stringify(v)}`));
  }
  console.log(`  ${people.length - updates.length - problems.length} cuentas ya coinciden con el listado; ${updates.length} necesitan cambios.`);

  if (problems.length) {
    console.log('\n⚠️  REVISAR A MANO');
    problems.forEach((p) => console.log(`  - ${p}`));
  }

  const outside = active.filter((u) => !matchedIds.has(u.id));
  const outsideAdmins = outside.filter((u) => u.role === 'admin');
  const outsideOthers = outside.filter((u) => u.role !== 'admin');
  console.log(`\nCUENTAS ACTIVAS QUE NO ESTÁN EN EL LISTADO: ${outside.length}`);
  outsideAdmins.forEach((u) => console.log(`  (admin, no se toca) ${u.email} — ${u.displayName}`));
  outsideOthers.forEach((u) => console.log(`  ${u.email} — ${u.displayName} — ${u.position || u.cargo || 'sin puesto'} (${u.area || 'sin área'})`));

  console.log(`\nCUENTAS YA DESACTIVADAS: ${inactive.length}`);
  inactive.forEach((u) => console.log(`  ${u.email} — ${u.displayName}${u.replacedBy ? ` → reemplazada por ${u.replacedBy}` : ''}`));

  // ── Escritura
  const operations = [];
  const now = new Date();
  if (APPLY) updates.forEach(({ user, fields }) => operations.push({ type: 'update', id: user.id, email: user.email, data: { ...fields, updatedAt: now, updatedBy: UPDATED_BY } }));
  if (DELETE_INACTIVE) inactive.forEach((u) => operations.push({ type: 'delete', id: u.id, email: u.email }));
  if (OUTSIDE === 'borrar') outsideOthers.forEach((u) => operations.push({ type: 'delete', id: u.id, email: u.email }));
  if (OUTSIDE === 'desactivar') outsideOthers.forEach((u) => operations.push({ type: 'update', id: u.id, email: u.email, data: { active: false, deactivatedAt: now, updatedAt: now, updatedBy: UPDATED_BY } }));

  console.log('\n' + '='.repeat(72));
  if (operations.length === 0) {
    console.log(APPLY || DELETE_INACTIVE || OUTSIDE ? 'No hay nada que cambiar.' : 'SOLO MOSTRAR: no se cambió nada.');
    return;
  }

  mkdirSync('data', { recursive: true });
  const backupFile = join('data', `respaldo-usuarios-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  const replacer = (_k, v) => (v && typeof v === 'object' && typeof v.toMillis === 'function' ? { __fecha: new Date(v.toMillis()).toISOString() } : v);
  writeFileSync(backupFile, JSON.stringify(users, replacer, 2));
  console.log(`Copia de seguridad: ${backupFile}`);

  for (let i = 0; i < operations.length; i += 400) {
    const batch = writeBatch(db);
    operations.slice(i, i + 400).forEach((op) => {
      const ref = doc(db, 'users', op.id);
      if (op.type === 'delete') batch.delete(ref);
      else batch.update(ref, op.data);
    });
    await batch.commit();
  }
  const count = (type) => operations.filter((op) => op.type === type).length;
  console.log(`Hecho: ${count('update')} cuentas actualizadas, ${count('delete')} cuentas borradas.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('\nError:', error?.code || '', error?.message || error);
  if (error?.code === 'permission-denied') {
    console.error('Las reglas desplegadas no permiten esta operación sin sesión. No se aplicó el lote.');
  }
  process.exit(1);
});
