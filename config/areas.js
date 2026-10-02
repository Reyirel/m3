// config/areas.js
// Configuración centralizada de todas las Secretarías y Direcciones del municipio
// Actualizado: Octubre 2026 — estructura oficial del organigrama municipal

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

export const DIRECCIONES = [
  // Despacho de la Presidencia
  'Dirección de Audiencias y Atención Ciudadana',
  'Secretaría Particular y Relaciones Públicas',
  'Dirección de Logística y Eventos',
  'Dirección Jurídica',
  'Instancia Municipal para el Desarrollo de las Mujeres',
  'Dirección de Comunicación Social y Marketing Digital',
  'Secretaría Ejecutiva de SIPINNA',
  'Asesor Técnico Especializado',

  // Contraloría Municipal
  'Dirección de la Unidad de Investigación',
  'Dirección de la Unidad de Substanciación',
  'Unidad Municipal de Transparencia y Acceso a la Información',

  // Secretaría General Municipal
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

  // Secretaría de Tesorería Municipal
  'Dirección de Cuenta Pública',
  'Dirección de Control y Seguimiento de Egresos',
  'Dirección de Catastro',
  'Dirección de Ingresos y Estrategias de Recaudación',
  'Dirección de Administración',
  'Dirección de Recursos Humanos y Nómina',

  // Secretaría de Obras Públicas y Desarrollo Urbano
  'Dirección de Obras Públicas',
  'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
  'Dirección de Servicios Públicos y Limpias',
  'Dirección de Servicios Municipales',
  'Dirección de Medio Ambiente y Desarrollo Sostenible',

  // Secretaría de Planeación y Evaluación
  'Dirección de Planeación y Evaluación',
  'Dirección de Tecnologías de la Información',

  // Secretaría de Desarrollo Económico y Turismo
  'Dirección de Turismo',
  'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
  'Dirección de Desarrollo Económico',

  // Secretaría de Bienestar Social
  'Dirección de Cultura',
  'Dirección del Deporte',
  'Dirección de Salud',
  'Dirección de Educación',
  'Dirección de Programas Sociales',
  'Instancia Municipal de la Juventud',

  // Secretaría de Seguridad Pública
  'Dirección de Protección Civil y Bomberos',
];

// Otras áreas/organismos (Asamblea Municipal, organismos descentralizados)
export const OTRAS_AREAS = [
  'Asamblea Municipal',
  'SMDIF',
  'CAPASMIH',
];

// Todas las áreas ordenadas alfabéticamente
export const TODAS_LAS_AREAS = [...SECRETARIAS, ...DIRECCIONES, ...OTRAS_AREAS].sort();

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

// Función para obtener áreas filtradas por tipo
export const getAreasByType = (type) => {
  if (type === 'secretaria') return SECRETARIAS;
  if (type === 'direccion') return DIRECCIONES;
  return TODAS_LAS_AREAS;
};
