// config/areas.js
// Secretarías y direcciones del municipio.
//
// Las listas de este archivo son el organigrama INICIAL. El organigrama vigente es el que
// el administrador edita en Administración → Organigrama (Firestore: metadata/orgStructure);
// al cargarse, services/orgStructure.js llama a applyOrgStructure() y estas mismas listas
// se actualizan en su lugar, de modo que permisos, selectores y reportes usan siempre
// el organigrama vigente.

export const SECRETARIAS = [
  'Despacho de la Presidencia',
  'Secretaría General Municipal',
  'Secretaría de Tesorería Municipal',
  'Secretaría de Obras Públicas y Desarrollo Urbano',
  'Secretaría de Planeación y Evaluación',
  'Secretaría de Desarrollo Económico y Turismo',
  'Secretaría de Bienestar Social',
  'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
  'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas',
  'Contraloría Municipal',
];

// Mapeo de Secretarías a sus Direcciones
// Fuente de verdad: organigrama oficial del municipio (Marzo 2026)
export const SECRETARIAS_DIRECCIONES = {
  // Despacho del Presidente Municipal — José Emanuel Hernández Pascual
  'Despacho de la Presidencia': [
    'Dirección de Audiencias y Atención Ciudadana',
    'Secretaría Particular y Relaciones Públicas',
    'Dirección de Logística y Eventos',
    'Dirección Jurídica',
    'Instancia Municipal para el Desarrollo de las Mujeres',
    'Dirección de Comunicación Social y Marketing Digital',
    'Secretaría Ejecutiva de SIPINNA',
    'Secretario Técnico',
  ],

  // Secretaría General Municipal — Jaime Aldrin Rosales Azuara
  'Secretaría General Municipal': [
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

  // Secretaría de Tesorería Municipal — Rubén Martínez Sánchez
  'Secretaría de Tesorería Municipal': [
    'Dirección de Cuenta Pública',
    'Dirección de Control y Seguimiento de Egresos',
    'Dirección de Catastro',
    'Dirección de Ingresos y Estrategias de Recaudación',
    'Dirección de Administración',
    'Dirección de Recursos Humanos y Nómina',
  ],

  // Secretaría de Obras Públicas y Desarrollo Urbano — Iván Arturo Lugo Martín
  'Secretaría de Obras Públicas y Desarrollo Urbano': [
    'Dirección de Obras Públicas',
    'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
    'Dirección de Servicios Públicos y Limpias',
    'Dirección de Servicios Municipales',
    'Dirección de Medio Ambiente y Desarrollo Sostenible',
  ],

  // Secretaría de Planeación y Evaluación — Rigoberto Barrera Roldán
  'Secretaría de Planeación y Evaluación': [
    'Dirección de Planeación y Evaluación',
    'Dirección de Tecnologías de la Información',
  ],

  // Secretaría de Desarrollo Económico y Turismo — Amalia Escalante Cruz
  'Secretaría de Desarrollo Económico y Turismo': [
    'Dirección de Turismo',
    'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
    'Dirección de Desarrollo Económico',
  ],

  // Secretaría de Bienestar Social — Diego Armando Corona Herrera
  'Secretaría de Bienestar Social': [
    'Dirección de Cultura',
    'Dirección del Deporte',
    'Dirección de Salud',
    'Dirección de Educación',
    'Dirección de Programas Sociales',
    'Instancia Municipal de la Juventud',
  ],

  // Secretaría de Seguridad Pública — Diadymir Morelos Esquivel
  'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil': [
    'Dirección de Protección Civil y Bomberos',
  ],

  // Secretaría de Desarrollo para Pueblos y Comunidades Indígenas — Anahí Catalán Legorreta
  'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas': [],

  // Contraloría Municipal — Marianne Citlalli Chávez Guerrero (entidad autónoma)
  'Contraloría Municipal': [
    'Dirección de la Unidad de Investigación',
    'Dirección de la Unidad de Substanciación',
    'Unidad Municipal de Transparencia y Acceso a la Información',
  ],
};

// Función para obtener las direcciones de una secretaría
export const getDireccionesBySecretaria = (secretaria) => {
  return SECRETARIAS_DIRECCIONES[secretaria] || [];
};

// Helper para normalizar nombres de área
const normalizeAreaName = (name) => (name || '').trim()
  .replace(/^(Secretaría|Dirección|Oficialía|Oficial)\s+(Técnica\s+)?(de|del|General)\s*/i, '')
  .replace(/^(Secretaría|Dirección)\s+/i, '')
  .trim().toLowerCase();

// Función para obtener la secretaría de una dirección (o de sí misma si ya es secretaría)
export const getSecretariaByDireccion = (direccion) => {
  if (!direccion) return null;
  // Resolver alias primero (e.g., "Secretaría de Seguridad Pública" → nombre completo)
  const resolved = AREA_ALIASES[direccion] || direccion;
  // Si el input YA es una secretaría, retornarla directamente
  if (SECRETARIAS.includes(resolved)) return resolved;
  if (SECRETARIAS.includes(direccion)) return direccion;
  // Buscar si alguna secretaría contiene o es contenida por el input
  const secByPartial = SECRETARIAS.find(s => s.includes(resolved) || resolved.includes(s));
  if (secByPartial) return secByPartial;

  const dirNorm = normalizeAreaName(resolved);
  for (const [secretaria, direcciones] of Object.entries(SECRETARIAS_DIRECCIONES)) {
    // Coincidencia exacta
    if (direcciones.includes(resolved) || direcciones.includes(direccion)) {
      return secretaria;
    }
    // Coincidencia parcial
    if (direcciones.some(dir => dir.includes(resolved) || resolved.includes(dir))) {
      return secretaria;
    }
    // Coincidencia normalizada ("Oficialía" vs "Oficial", "Técnica de" vs "de", etc.)
    if (dirNorm && dirNorm.length > 3 && direcciones.some(dir => {
      const norm = normalizeAreaName(dir);
      return norm && norm.length > 3 && (norm === dirNorm || norm.includes(dirNorm) || dirNorm.includes(norm));
    })) {
      return secretaria;
    }
  }
  return null;
};

// Mapeo de nombres alternativos/variantes encontrados en Firestore
export const AREA_ALIASES = {
  // Variantes de secretarías
  'Secretaría de Seguridad Pública': 'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
  'Secretaría de Desarrollo Económico y Turístico': 'Secretaría de Desarrollo Económico y Turismo',
  'Despacho Presidencial': 'Despacho de la Presidencia',
  // Variantes de direcciones
  'Oficialía del Registro del Estado Familiar': 'Oficial del Registro del Estado Familiar',
  'Dirección Técnica de Planeación y Evaluación': 'Dirección de Planeación y Evaluación',
  'Dirección de Obra Pública': 'Dirección de Obras Públicas',
  'Dirección Jurídico': 'Dirección Jurídica',
  'Director Jurídico': 'Dirección Jurídica',
  'Contraloría': 'Contraloría Municipal',
  'Unidad de Investigación': 'Dirección de la Unidad de Investigación',
  'Unidad de Substanciación': 'Dirección de la Unidad de Substanciación',
  'Dirección de Audiencias': 'Dirección de Audiencias y Atención Ciudadana',
  'Conciliador Municipal': 'Conciliación Municipal',
  'Instancia Municipal de la Juventud': 'Instancia Municipal de la Juventud',
};

// Normalizar un nombre de área a su nombre canónico en el config
export const resolveAreaName = (name) => {
  if (!name) return name;
  return AREA_ALIASES[name] || name;
};

// Secretarías a las que pertenece una lista de áreas (nombres canónicos, sin repetir).
// Un área sin secretaría (SMDIF, CAPASMIH, Asamblea) se representa a sí misma.
// Se guarda en cada tarea (campo `secretarias`) para filtrar la visibilidad del secretario.
export const getSecretariasForAreas = (areas) => {
  const list = Array.isArray(areas) ? areas : areas ? [areas] : [];
  const result = new Set();
  list.forEach((area) => {
    const resolved = resolveAreaName((area || '').trim());
    if (!resolved) return;
    result.add(getSecretariaByDireccion(resolved) || resolved);
  });
  return [...result];
};

// Todas las direcciones, en el orden del organigrama (se deriva del mapa de arriba)
export const DIRECCIONES = Object.values(SECRETARIAS_DIRECCIONES).flat();

// Otras áreas/organismos (Asamblea Municipal, organismos descentralizados)
export const OTRAS_AREAS = [
  'Asamblea Municipal',
  'SMDIF',
  'CAPASMIH',
];

// Todas las áreas ordenadas alfabéticamente
const sortAreas = (areas) => [...new Set(areas)].sort((x, y) => x.localeCompare(y, 'es'));
export const TODAS_LAS_AREAS = sortAreas([...SECRETARIAS, ...DIRECCIONES, ...OTRAS_AREAS]);

// Mapeo simplificado para mantener compatibilidad con código existente
export const AREAS = TODAS_LAS_AREAS;

// Función para obtener el tipo de área
export const getAreaType = (area) => {
  if (SECRETARIAS.includes(area)) {
    return 'secretaria';
  }
  if (DIRECCIONES.includes(area)) {
    return 'direccion';
  }
  return 'unknown';
};

// ─── Organigrama vigente ───────────────────────────────────────────────────────

const cloneStructure = (structure) => ({
  secretarias: structure.secretarias.map((sec) => ({
    nombre: sec.nombre,
    direcciones: [...sec.direcciones],
  })),
});

const structureFromLists = () => ({
  secretarias: SECRETARIAS.map((nombre) => ({
    nombre,
    direcciones: [...(SECRETARIAS_DIRECCIONES[nombre] || [])],
  })),
});

// Organigrama con el que arranca la app (el escrito en este archivo)
export const DEFAULT_ORG_STRUCTURE = structureFromLists();

const listeners = new Set();

/** Organigrama vigente: { secretarias: [{ nombre, direcciones: [] }] } */
export const getOrgStructure = () => structureFromLists();

/** Avisar cuando cambie el organigrama. Devuelve la función para dejar de escuchar. */
export const subscribeOrgStructure = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Limpia un organigrama leído de Firestore: nombres sin espacios sobrantes, sin
 * secretarías ni direcciones repetidas. Devuelve null si no tiene la forma esperada.
 */
export const sanitizeOrgStructure = (structure) => {
  if (!structure || !Array.isArray(structure.secretarias)) return null;
  const seenSecretarias = new Set();
  const seenDirecciones = new Set();
  const secretarias = [];
  structure.secretarias.forEach((sec) => {
    const nombre = typeof sec?.nombre === 'string' ? sec.nombre.trim() : '';
    if (!nombre || seenSecretarias.has(nombre)) return;
    seenSecretarias.add(nombre);
    const direcciones = [];
    (Array.isArray(sec.direcciones) ? sec.direcciones : []).forEach((dir) => {
      const name = typeof dir === 'string' ? dir.trim() : '';
      // Una dirección pertenece a una sola secretaría: la primera en la que aparece
      if (!name || seenDirecciones.has(name)) return;
      seenDirecciones.add(name);
      direcciones.push(name);
    });
    secretarias.push({ nombre, direcciones });
  });
  return secretarias.length > 0 ? { secretarias } : null;
};

/**
 * Reemplaza el organigrama vigente. Las listas exportadas (SECRETARIAS, DIRECCIONES,
 * SECRETARIAS_DIRECCIONES, TODAS_LAS_AREAS) se modifican en su lugar: quien ya las
 * importó ve los valores nuevos sin volver a cargar la app.
 * @returns {boolean} true si el organigrama era válido y se aplicó
 */
export const applyOrgStructure = (structure) => {
  const clean = sanitizeOrgStructure(structure);
  if (!clean) return false;

  SECRETARIAS.splice(0, SECRETARIAS.length, ...clean.secretarias.map((sec) => sec.nombre));
  Object.keys(SECRETARIAS_DIRECCIONES).forEach((key) => delete SECRETARIAS_DIRECCIONES[key]);
  clean.secretarias.forEach((sec) => {
    SECRETARIAS_DIRECCIONES[sec.nombre] = [...sec.direcciones];
  });
  DIRECCIONES.splice(0, DIRECCIONES.length, ...clean.secretarias.flatMap((sec) => sec.direcciones));
  TODAS_LAS_AREAS.splice(
    0,
    TODAS_LAS_AREAS.length,
    ...sortAreas([...SECRETARIAS, ...DIRECCIONES, ...OTRAS_AREAS])
  );

  listeners.forEach((listener) => {
    try {
      listener(getOrgStructure());
    } catch (_e) {
      // Un oyente con error no debe impedir avisar a los demás
    }
  });
  return true;
};

/** Volver al organigrama inicial (pruebas) */
export const resetOrgStructure = () => applyOrgStructure(cloneStructure(DEFAULT_ORG_STRUCTURE));

/**
 * Organigrama con una dirección movida a otra secretaría (no modifica el original).
 * @param {Object} structure - Organigrama de partida
 * @param {string} direccion - Dirección a mover
 * @param {string} toSecretaria - Secretaría de destino
 * @param {number} [toIndex] - Posición dentro de la secretaría de destino (al final si se omite)
 * @returns {{ structure: Object, fromSecretaria: string|null, changed: boolean }}
 */
export const moveDireccionInStructure = (structure, direccion, toSecretaria, toIndex) => {
  const next = cloneStructure(structure);
  const target = next.secretarias.find((sec) => sec.nombre === toSecretaria);
  const source = next.secretarias.find((sec) => sec.direcciones.includes(direccion));
  if (!target || !source) return { structure, fromSecretaria: source?.nombre || null, changed: false };

  const fromIndex = source.direcciones.indexOf(direccion);
  source.direcciones.splice(fromIndex, 1);
  let index = typeof toIndex === 'number' ? toIndex : target.direcciones.length;
  // Dentro de la misma secretaría, quitarla primero corre una posición las que le siguen
  if (source === target && fromIndex < index) index -= 1;
  index = Math.max(0, Math.min(index, target.direcciones.length));
  target.direcciones.splice(index, 0, direccion);

  const changed = source !== target || index !== fromIndex;
  return { structure: changed ? next : structure, fromSecretaria: source.nombre, changed };
};

const nameKey = (name) => (name || '').trim().toLowerCase();

/**
 * Motivo por el que un nombre no sirve para un área nueva o renombrada (null si sirve).
 * @param {Object} structure - Organigrama contra el que se revisa
 * @param {string} name - Nombre propuesto
 * @param {string} [currentName] - Nombre actual del área que se renombra
 */
export const getAreaNameError = (structure, name, currentName) => {
  const clean = (name || '').trim();
  if (!clean) return 'Escribe un nombre.';
  // Corregir solo mayúsculas del mismo nombre siempre se permite
  if (currentName && nameKey(clean) === nameKey(currentName)) return null;
  const taken = [
    ...structure.secretarias.flatMap((sec) => [sec.nombre, ...sec.direcciones]),
    ...OTRAS_AREAS,
  ];
  if (taken.some((existing) => nameKey(existing) === nameKey(clean))) {
    return `Ya existe un área llamada "${clean}".`;
  }
  const alias = AREA_ALIASES[clean];
  if (alias && alias !== clean) return `"${clean}" ya se usa como otro nombre de "${alias}".`;
  return null;
};

/**
 * Organigrama con una secretaría o dirección renombrada (no modifica el original).
 * @returns {{ structure: Object, changed: boolean }}
 */
export const renameAreaInStructure = (structure, oldName, newName) => {
  const next = cloneStructure(structure);
  let changed = false;
  next.secretarias.forEach((sec) => {
    if (sec.nombre === oldName) {
      sec.nombre = newName;
      changed = true;
    }
    const index = sec.direcciones.indexOf(oldName);
    if (index >= 0) {
      sec.direcciones[index] = newName;
      changed = true;
    }
  });
  return { structure: changed ? next : structure, changed };
};

/**
 * Organigrama sin una dirección, o sin una secretaría que ya no tiene direcciones
 * (no modifica el original). Una secretaría con direcciones, o la única que queda,
 * no se quita.
 * @returns {{ structure: Object, changed: boolean }}
 */
export const removeAreaFromStructure = (structure, name) => {
  const next = cloneStructure(structure);
  const secIndex = next.secretarias.findIndex((sec) => sec.nombre === name);
  if (secIndex >= 0) {
    if (next.secretarias[secIndex].direcciones.length > 0 || next.secretarias.length === 1) {
      return { structure, changed: false };
    }
    next.secretarias.splice(secIndex, 1);
    return { structure: next, changed: true };
  }
  const source = next.secretarias.find((sec) => sec.direcciones.includes(name));
  if (!source) return { structure, changed: false };
  source.direcciones.splice(source.direcciones.indexOf(name), 1);
  return { structure: next, changed: true };
};

/**
 * Organigrama con una secretaría nueva, sin direcciones, al final (no modifica el original).
 * @returns {{ structure: Object, changed: boolean }}
 */
export const addSecretariaToStructure = (structure, nombre) => {
  const clean = (nombre || '').trim();
  if (getAreaNameError(structure, clean)) return { structure, changed: false };
  const next = cloneStructure(structure);
  next.secretarias.push({ nombre: clean, direcciones: [] });
  return { structure: next, changed: true };
};

/**
 * Organigrama con una secretaría en otra posición (no modifica el original).
 * @param {number} toIndex - Posición final de la secretaría
 * @returns {{ structure: Object, changed: boolean }}
 */
export const moveSecretariaInStructure = (structure, nombre, toIndex) => {
  const fromIndex = structure.secretarias.findIndex((sec) => sec.nombre === nombre);
  const index = Math.max(0, Math.min(toIndex, structure.secretarias.length - 1));
  if (fromIndex < 0 || index === fromIndex) return { structure, changed: false };
  const next = cloneStructure(structure);
  const [moved] = next.secretarias.splice(fromIndex, 1);
  next.secretarias.splice(index, 0, moved);
  return { structure: next, changed: true };
};
