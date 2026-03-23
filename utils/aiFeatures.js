/**
 * utils/aiFeatures.js
 * Motores de IA local para la app municipal.
 * Funcionan 100% offline sin API key — heurísticas basadas en datos reales de Firestore.
 *
 * Features:
 *   1. generateDailySummary    — Resumen natural del día
 *   2. findSimilarTasks        — Detección de tareas duplicadas
 *   3. suggestTaskMetadata     — Sugerencia de área y responsable
 *   4. generateSubtasks        — Subtareas desde título/descripción
 *   5. predictDelayRisk        — Alerta predictiva de retraso
 */

import { toMs } from './dateUtils';

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Tokeniza texto en palabras significativas (quita stopwords en español).
 */
const STOPWORDS = new Set([
  'de','la','el','en','y','a','los','las','un','una','por','con','del',
  'para','se','su','que','al','es','lo','le','más','como','pero','si',
  'no','mi','tu','te','yo','me','hay','bien','este','esta','ese','esa',
  'ser','tener','hacer','su','sus','o','e','ni','ya','también','muy',
]);

function tokenize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Similitud Jaccard entre dos conjuntos de tokens.
 * Retorna valor entre 0 (ninguna similitud) y 1 (idénticos).
 */
function jaccardSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Formatea un número de horas restantes en texto legible.
 */
function hoursToText(hours) {
  if (hours < 1) return 'menos de 1 hora';
  if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} día${days !== 1 ? 's' : ''}`;
}

// ─── Feature 1: Resumen inteligente del día ───────────────────────────────────

/**
 * Genera un resumen en lenguaje natural de la situación de tareas del usuario.
 * @param {Array}  tasks      - Tareas visibles para el usuario
 * @param {Object} user       - currentUser ({ email, role, name, area })
 * @returns {{ headline: string, details: string[], urgentCount: number, overdueCount: number }}
 */
export function generateDailySummary(tasks, user) {
  if (!tasks?.length || !user) {
    return {
      headline: 'No hay tareas asignadas',
      details: [],
      urgentCount: 0,
      overdueCount: 0,
    };
  }

  const now = Date.now();
  const in6h = now + 6 * 60 * 60 * 1000;
  const in24h = now + 24 * 60 * 60 * 1000;

  const overdue = tasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) < now);
  const urgent = tasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) > now && toMs(t.dueAt) < in6h);
  const dueToday = tasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) > now && toMs(t.dueAt) < in24h);
  const inProgress = tasks.filter(t => t.status === 'en_proceso');
  const inReview = tasks.filter(t => t.status === 'en_revision');
  const pending = tasks.filter(t => t.status === 'pendiente');
  const closed = tasks.filter(t => t.status === 'cerrada');

  // Headline según la situación más crítica
  let headline;
  if (overdue.length > 0) {
    headline = `${overdue.length} tarea${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`;
  } else if (urgent.length > 0) {
    headline = `${urgent.length} tarea${urgent.length > 1 ? 's' : ''} vence${urgent.length > 1 ? 'n' : ''} en menos de 6 horas`;
  } else if (dueToday.length > 0) {
    headline = `${dueToday.length} tarea${dueToday.length > 1 ? 's' : ''} vence${dueToday.length > 1 ? 'n' : ''} hoy`;
  } else if (inProgress.length > 0) {
    headline = `${inProgress.length} tarea${inProgress.length > 1 ? 's' : ''} en progreso`;
  } else {
    headline = `${tasks.length} tarea${tasks.length > 1 ? 's' : ''} en total`;
  }

  // Detalles secundarios
  const details = [];
  if (overdue.length > 0) details.push(`${overdue.length} vencidas requieren atención inmediata`);
  if (inReview.length > 0) details.push(`${inReview.length} en revisión pendiente de aprobación`);
  if (inProgress.length > 0) details.push(`${inProgress.length} en progreso activo`);
  if (pending.length > 0) details.push(`${pending.length} pendientes sin iniciar`);
  if (closed.length > 0) details.push(`${closed.length} completadas`);

  // Área más cargada (solo para admin/secretario)
  if (user.role === 'admin' || user.role === 'secretario') {
    const areaCounts = {};
    tasks.filter(t => t.status !== 'cerrada').forEach(t => {
      const area = t.area || 'Sin área';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];
    if (topArea && topArea[1] > 1) {
      details.push(`Área más cargada: ${topArea[0]} (${topArea[1]} tareas)`);
    }
  }

  return { headline, details, urgentCount: urgent.length, overdueCount: overdue.length };
}

// ─── Feature 2: Detección de duplicados ───────────────────────────────────────

/**
 * Busca tareas existentes similares al título dado.
 * @param {string} title   - Título que el usuario está escribiendo
 * @param {Array}  tasks   - Tareas existentes
 * @param {number} threshold - Umbral de similitud (0-1, default 0.45)
 * @returns {Array<{ task: Object, score: number }>} Tareas similares ordenadas por score
 */
export function findSimilarTasks(title, tasks, threshold = 0.45) {
  if (!title || title.length < 6 || !tasks?.length) return [];

  const inputTokens = tokenize(title);
  if (inputTokens.length === 0) return [];

  const results = tasks
    .filter(t => t.status !== 'cerrada' && t.title)
    .map(t => ({
      task: t,
      score: jaccardSimilarity(inputTokens, tokenize(t.title)),
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return results;
}

// ─── Feature 3: Sugerencia de área y responsable ──────────────────────────────

/**
 * Sugiere área y responsable basándose en tareas históricas con títulos similares.
 * @param {string} title  - Título que el usuario está escribiendo
 * @param {Array}  tasks  - Historial de tareas
 * @returns {{ area: string|null, assignedTo: string|null, confidence: number }}
 */
export function suggestTaskMetadata(title, tasks) {
  if (!title || title.length < 8 || !tasks?.length) {
    return { area: null, assignedTo: null, confidence: 0 };
  }

  const inputTokens = tokenize(title);
  if (inputTokens.length === 0) return { area: null, assignedTo: null, confidence: 0 };

  // Solo tareas con área definida
  const scored = tasks
    .filter(t => t.area && t.title)
    .map(t => ({ t, score: jaccardSimilarity(inputTokens, tokenize(t.title)) }))
    .filter(r => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) return { area: null, assignedTo: null, confidence: 0 };

  // Área más frecuente entre los top-5
  const areaCounts = {};
  scored.forEach(({ t }) => {
    areaCounts[t.area] = (areaCounts[t.area] || 0) + 1;
  });
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];

  // Responsable más frecuente para esa área
  const responsablesByArea = scored
    .filter(({ t }) => t.area === topArea[0] && t.assignedTo)
    .map(({ t }) => Array.isArray(t.assignedTo) ? t.assignedTo[0] : t.assignedTo)
    .filter(Boolean);

  const responsableCounts = {};
  responsablesByArea.forEach(r => { responsableCounts[r] = (responsableCounts[r] || 0) + 1; });
  const topResponsable = Object.entries(responsableCounts).sort((a, b) => b[1] - a[1])[0];

  const confidence = scored[0].score;

  return {
    area: topArea[0],
    assignedTo: topResponsable ? topResponsable[0] : null,
    confidence,
  };
}

// ─── Feature 4: Generación de subtareas ───────────────────────────────────────

/**
 * Mapa de categorías → subtareas típicas.
 * Basado en tareas comunes de gobierno municipal mexicano.
 */
const SUBTASK_TEMPLATES = {
  // Obras y construcción
  obra: ['Revisar presupuesto disponible', 'Solicitar cotizaciones a proveedores', 'Revisar especificaciones técnicas', 'Obtener permisos de construcción', 'Supervisar inicio de obra', 'Verificar avance físico', 'Liberación final y recepción'],
  construccion: ['Revisar planos y especificaciones', 'Solicitar materiales', 'Asignar cuadrilla de trabajo', 'Supervisar ejecución', 'Documentar avance con fotografías', 'Entrega y cierre'],
  pavimentacion: ['Estudio de tránsito', 'Diseño de trazo', 'Solicitud de materiales', 'Preparación de terracería', 'Aplicación de carpeta', 'Señalización vial', 'Entrega a vialidades'],
  mantenimiento: ['Diagnóstico del problema', 'Cotizar reparación', 'Autorizar presupuesto', 'Ejecutar mantenimiento', 'Verificar calidad del trabajo', 'Cerrar reporte'],

  // Administrativo
  contrato: ['Verificar presupuesto autorizado', 'Elaborar términos de referencia', 'Publicar convocatoria', 'Recepción y evaluación de propuestas', 'Dictamen de adjudicación', 'Firma de contrato', 'Inicio de actividades', 'Supervisión de cumplimiento'],
  licitacion: ['Elaborar bases de licitación', 'Publicar en medios oficiales', 'Visita de obra o junta de aclaraciones', 'Recepción de propuestas', 'Apertura de propuestas', 'Evaluación técnica y económica', 'Fallo de licitación', 'Firma de contrato'],
  informe: ['Recopilar datos de áreas', 'Redactar borrador', 'Revisar con coordinación', 'Incorporar correcciones', 'Validar con director', 'Enviar informe final'],
  reporte: ['Recopilar evidencias fotográficas', 'Redactar narrativa de avance', 'Incluir indicadores', 'Revisar y corregir', 'Presentar al jefe inmediato'],
  reunion: ['Definir orden del día', 'Convocar a participantes', 'Preparar presentación', 'Celebrar reunión', 'Levantar minuta', 'Dar seguimiento a acuerdos'],
  presupuesto: ['Revisar techos presupuestarios', 'Identificar necesidades por área', 'Elaborar propuesta de distribución', 'Validar con dirección', 'Enviar a finanzas'],

  // Servicios públicos
  alumbrado: ['Diagnóstico de luminarias', 'Elaborar lista de fallas', 'Solicitar materiales eléctricos', 'Asignar brigada', 'Reparar luminarias', 'Verificar funcionamiento', 'Reporte de cierre'],
  agua: ['Identificar zona afectada', 'Diagnóstico de red', 'Solicitar materiales de fontanería', 'Reparar fugas', 'Verificar presión del servicio', 'Notificar a usuarios', 'Reporte de atención'],
  limpieza: ['Programar rutas de recolección', 'Asignar personal y equipo', 'Ejecutar limpieza', 'Disponer residuos correctamente', 'Reporte de cobertura'],
  parque: ['Diagnóstico del estado actual', 'Plan de mejora', 'Solicitar materiales de jardinería', 'Ejecutar trabajos', 'Fotografiar resultado', 'Reporte de entrega'],

  // Trámites y ciudadanos
  tramite: ['Recibir solicitud del ciudadano', 'Verificar documentación requerida', 'Registrar en sistema', 'Dar trámite interno', 'Notificar resolución al ciudadano', 'Archivar expediente'],
  permiso: ['Recibir solicitud', 'Revisar requisitos legales', 'Verificar pagos de derechos', 'Emitir dictamen técnico', 'Firmar y sellar permiso', 'Entregar al solicitante'],
  evento: ['Definir fecha y lugar', 'Elaborar programa', 'Solicitar apoyos logísticos', 'Coordinar con seguridad', 'Preparar montaje', 'Ejecutar evento', 'Reporte de resultados'],

  // Salud
  campana: ['Definir población objetivo', 'Coordinar personal de salud', 'Solicitar insumos médicos', 'Programar brigadas', 'Ejecutar campaña', 'Registrar cobertura', 'Reporte epidemiológico'],
  vacunacion: ['Solicitar vacunas a jurisdicción', 'Programar fechas por localidad', 'Coordinar personal', 'Ejecutar jornada', 'Registrar dosis aplicadas', 'Reporte final'],

  // Default genérico
  default: ['Revisar antecedentes y contexto', 'Definir alcance y objetivos', 'Identificar responsables', 'Establecer cronograma', 'Ejecutar actividades principales', 'Documentar avance', 'Verificar resultados', 'Cerrar y archivar'],
};

/**
 * Genera una lista de subtareas sugeridas basándose en el título y descripción.
 * Funciona 100% offline con heurísticas de palabras clave.
 *
 * @param {string} title       - Título de la tarea
 * @param {string} description - Descripción opcional
 * @returns {{ subtasks: string[], category: string, confidence: 'alta'|'media'|'baja' }}
 */
export function generateSubtasks(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Buscar coincidencias con las categorías
  const matches = [];
  for (const [keyword, subtasks] of Object.entries(SUBTASK_TEMPLATES)) {
    if (keyword === 'default') continue;
    if (text.includes(keyword)) {
      matches.push({ keyword, subtasks });
    }
  }

  if (matches.length === 0) {
    // Segundo intento: buscar palabras del título en los keywords
    const words = tokenize(text);
    for (const [keyword, subtasks] of Object.entries(SUBTASK_TEMPLATES)) {
      if (keyword === 'default') continue;
      if (words.some(w => keyword.includes(w) || w.includes(keyword))) {
        matches.push({ keyword, subtasks });
      }
    }
  }

  if (matches.length === 0) {
    return {
      subtasks: SUBTASK_TEMPLATES.default,
      category: 'General',
      confidence: 'baja',
    };
  }

  // Usar la primera coincidencia más específica (keyword más largo)
  matches.sort((a, b) => b.keyword.length - a.keyword.length);
  const best = matches[0];

  return {
    subtasks: best.subtasks,
    category: best.keyword.charAt(0).toUpperCase() + best.keyword.slice(1),
    confidence: matches.length >= 2 ? 'alta' : 'media',
  };
}

// ─── Feature 5: Predicción de riesgo de retraso ───────────────────────────────

/**
 * Calcula el riesgo de retraso de una tarea basándose en patrones históricos.
 *
 * Factores:
 *   - % de tareas vencidas del mismo área en historial
 *   - % de tareas vencidas del mismo responsable en historial
 *   - Prioridad alta
 *   - Días restantes vs. promedio histórico de duración por área
 *
 * @param {Object} task      - Tarea a evaluar
 * @param {Array}  allTasks  - Historial completo de tareas
 * @returns {{ level: 'low'|'medium'|'high', score: number, reasons: string[] }}
 */
export function predictDelayRisk(task, allTasks) {
  if (!task || !allTasks?.length) return { level: 'low', score: 0, reasons: [] };

  const now = Date.now();
  const dueAt = toMs(task.dueAt);
  const reasons = [];
  let score = 0;

  // Factor 1: ya está vencida
  if (dueAt < now && task.status !== 'cerrada') {
    score += 100;
    reasons.push('La tarea ya superó su fecha límite');
    return { level: 'high', score, reasons };
  }

  // Factor 2: prioridad alta o urgente sin iniciar
  if (task.priority === 'alta' && task.status === 'pendiente') {
    score += 25;
    reasons.push('Prioridad alta sin iniciar');
  }

  // Factor 3: vence en menos de 48h y no está en progreso
  const hoursLeft = (dueAt - now) / (1000 * 60 * 60);
  if (hoursLeft < 48 && task.status === 'pendiente') {
    score += 30;
    reasons.push(`Vence en ${hoursToText(Math.max(0, Math.floor(hoursLeft)))} y aún no se inició`);
  } else if (hoursLeft < 24 && task.status === 'en_proceso') {
    score += 20;
    reasons.push(`Vence en ${hoursToText(Math.floor(hoursLeft))} y está en progreso`);
  }

  // Factor 4: tasa de retraso del área
  if (task.area) {
    const areaTasks = allTasks.filter(t => t.area === task.area && t.id !== task.id);
    const areaOverdue = areaTasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) < now);
    if (areaTasks.length >= 3) {
      const overdueRate = areaOverdue.length / areaTasks.length;
      if (overdueRate > 0.5) {
        score += 25;
        reasons.push(`${Math.round(overdueRate * 100)}% de tareas en ${task.area} están vencidas`);
      } else if (overdueRate > 0.25) {
        score += 10;
      }
    }
  }

  // Factor 5: tasa de retraso del responsable
  const responsable = Array.isArray(task.assignedTo) ? task.assignedTo[0] : task.assignedTo;
  if (responsable) {
    const personTasks = allTasks.filter(t => {
      const assigned = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return assigned.includes(responsable) && t.id !== task.id;
    });
    const personOverdue = personTasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) < now);
    if (personTasks.length >= 3) {
      const overdueRate = personOverdue.length / personTasks.length;
      if (overdueRate > 0.4) {
        score += 20;
        reasons.push(`El responsable tiene ${personOverdue.length} tarea(s) vencidas`);
      }
    }

    // Factor 6: carga del responsable (muchas tareas activas)
    const activeTasks = personTasks.filter(t => t.status !== 'cerrada').length;
    if (activeTasks > 8) {
      score += 15;
      reasons.push(`El responsable tiene ${activeTasks} tareas activas en simultáneo`);
    }
  }

  const level = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { level, score, reasons };
}

/**
 * Retorna etiqueta y color para un nivel de riesgo.
 */
export function riskLevelDisplay(level) {
  switch (level) {
    case 'high':   return { label: 'Riesgo alto',   color: '#EF4444', icon: 'warning' };
    case 'medium': return { label: 'Riesgo medio',  color: '#F59E0B', icon: 'time-outline' };
    default:       return { label: 'En tiempo',     color: '#10B981', icon: 'checkmark-circle-outline' };
  }
}

// ─── Feature 6: Sugerencia de prioridad ───────────────────────────────────────

/**
 * Palabras clave que indican alta/urgente prioridad.
 */
const PRIORITY_KEYWORDS = {
  urgente: ['urgente', 'urgencia', 'emergencia', 'inmediato', 'inmediata', 'critico', 'critica',
            'prioritario', 'prioritaria', 'alerta', 'atencion', 'hoy', 'ya', 'ahora'],
  alta:    ['importante', 'necesario', 'necesaria', 'requerido', 'requerida', 'obligatorio',
            'obligatoria', 'revision', 'inspeccion', 'supervision', 'contrato', 'licitacion',
            'presupuesto', 'autorizar', 'aprobar', 'gobernador', 'presidente', 'director',
            'reunion', 'sesion', 'cabildo', 'auditoria'],
  media:   ['seguimiento', 'actualizacion', 'reporte', 'informe', 'tramite', 'solicitud',
            'verificar', 'revisar', 'coordinar'],
};

/**
 * Sugiere la prioridad de una tarea basándose en palabras clave del título y descripción.
 * @param {string} title
 * @param {string} description
 * @returns {{ priority: 'urgente'|'alta'|'media'|'baja', confidence: 'alta'|'media'|'baja', reason: string|null }}
 */
export function suggestPriority(title = '', description = '') {
  if (!title || title.length < 4) return { priority: null, confidence: 'baja', reason: null };

  const text = `${title} ${description}`.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Buscar por nivel de mayor a menor urgencia
  for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    const matched = keywords.find(kw => text.includes(kw));
    if (matched) {
      const confidenceMap = { urgente: 'alta', alta: 'media', media: 'baja' };
      return {
        priority: level,
        confidence: confidenceMap[level],
        reason: `Detectado: "${matched}"`,
      };
    }
  }

  return { priority: 'baja', confidence: 'baja', reason: null };
}

// ─── Feature 7: Detección de tareas estancadas ────────────────────────────────

/**
 * Detecta tareas que llevan muchos días en "en_proceso" sin avanzar.
 * @param {Array}  tasks        - Lista de tareas
 * @param {number} thresholdDays - Días sin movimiento para considerar estancada (default: 5)
 * @returns {Array<{ task: Object, stalledDays: number }>} tareas estancadas, ordenadas por días
 */
export function detectStalledTasks(tasks, thresholdDays = 5) {
  if (!tasks?.length) return [];

  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  return tasks
    .filter(t => t.status === 'en_proceso')
    .map(t => {
      // Usar updatedAt si existe, si no createdAt
      const lastMovement = toMs(t.updatedAt) || toMs(t.createdAt) || 0;
      const stalledMs = now - lastMovement;
      return { task: t, stalledDays: Math.floor(stalledMs / (24 * 60 * 60 * 1000)) };
    })
    .filter(({ stalledDays }) => stalledDays >= thresholdDays)
    .sort((a, b) => b.stalledDays - a.stalledDays);
}

// ─── Feature 8: Sugerencia de fecha límite ────────────────────────────────────

/**
 * Duración típica por categoría (en días) basada en estándares municipales.
 */
const CATEGORY_DURATIONS = {
  obra: 30, construccion: 45, pavimentacion: 60, mantenimiento: 7,
  contrato: 20, licitacion: 30, informe: 3, reporte: 2, reunion: 1, presupuesto: 5,
  alumbrado: 3, agua: 2, limpieza: 1, parque: 7,
  tramite: 5, permiso: 10, evento: 7,
  campana: 14, vacunacion: 7,
};

/**
 * Sugiere una fecha límite realista basándose en tareas históricas del mismo área/categoría.
 * Si no hay historial suficiente, usa duraciones estándar por categoría.
 *
 * @param {string} title
 * @param {string} area
 * @param {Array}  allTasks - Historial de tareas cerradas
 * @returns {{ suggestedDate: Date|null, basisDays: number, source: 'historico'|'estandar'|null }}
 */
export function suggestDueDate(title = '', area = '', allTasks = []) {
  if (!title) return { suggestedDate: null, basisDays: 0, source: null };

  const text = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Intentar obtener duración histórica de tareas cerradas similares en el mismo área
  if (area && allTasks.length > 0) {
    const inputTokens = tokenize(text);
    const closedSimilar = allTasks
      .filter(t => t.status === 'cerrada' && t.area === area && t.createdAt && t.updatedAt)
      .map(t => {
        const sim = jaccardSimilarity(inputTokens, tokenize(t.title || ''));
        const durationDays = Math.round((toMs(t.updatedAt) - toMs(t.createdAt)) / (24 * 60 * 60 * 1000));
        return { sim, durationDays };
      })
      .filter(r => r.sim >= 0.25 && r.durationDays > 0 && r.durationDays <= 180)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5);

    if (closedSimilar.length >= 2) {
      const avgDays = Math.round(closedSimilar.reduce((s, r) => s + r.durationDays, 0) / closedSimilar.length);
      const date = new Date(Date.now() + avgDays * 24 * 60 * 60 * 1000);
      return { suggestedDate: date, basisDays: avgDays, source: 'historico' };
    }
  }

  // Fallback: duraciones estándar por categoría
  for (const [keyword, days] of Object.entries(CATEGORY_DURATIONS)) {
    if (text.includes(keyword)) {
      const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return { suggestedDate: date, basisDays: days, source: 'estandar' };
    }
  }

  return { suggestedDate: null, basisDays: 0, source: null };
}
