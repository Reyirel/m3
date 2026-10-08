/**
 * utils/taskStatus.js
 * Única fuente de verdad de los estados de tarea.
 *
 * En Firestore y en toda la app el estado es uno de STATUS. Datos antiguos pueden traer
 * variantes ('en_progreso', 'en-progreso', 'revision', 'completada'…): se normalizan al
 * leer (services/tasks.js) y aquí, para que ninguna pantalla tenga que compararlas a mano.
 */
export const STATUS = {
  PENDING: 'pendiente',
  IN_PROGRESS: 'en_proceso',
  IN_REVIEW: 'en_revision',
  CLOSED: 'cerrada',
};

const ALIASES = {
  pendiente: STATUS.PENDING,
  en_proceso: STATUS.IN_PROGRESS,
  en_progreso: STATUS.IN_PROGRESS,
  en_revision: STATUS.IN_REVIEW,
  revision: STATUS.IN_REVIEW,
  cerrada: STATUS.CLOSED,
  cerrado: STATUS.CLOSED,
  completada: STATUS.CLOSED,
  completado: STATUS.CLOSED,
};

/** Convierte cualquier variante al valor canónico. Sin estado → 'pendiente'. */
export function normalizeStatus(status) {
  if (!status) return STATUS.PENDING;
  const key = String(status).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return ALIASES[key] || status;
}

export const isInProgress = (status) => normalizeStatus(status) === STATUS.IN_PROGRESS;
export const isInReview = (status) => normalizeStatus(status) === STATUS.IN_REVIEW;
export const isClosed = (status) => normalizeStatus(status) === STATUS.CLOSED;

/**
 * ¿La tarea pasa el filtro de estado?
 * Acepta 'todas' / 'all', un estado canónico o cualquiera de sus variantes.
 */
export function matchesStatusFilter(status, filter) {
  if (!filter || filter === 'todas' || filter === 'all') return true;
  return normalizeStatus(status) === normalizeStatus(filter);
}

/** Cuenta las tareas por estado canónico: { pendiente, en_proceso, en_revision, cerrada } */
export function countByStatus(tasks = []) {
  const counts = { [STATUS.PENDING]: 0, [STATUS.IN_PROGRESS]: 0, [STATUS.IN_REVIEW]: 0, [STATUS.CLOSED]: 0 };
  tasks.forEach((task) => {
    const status = normalizeStatus(task?.status);
    if (counts[status] !== undefined) counts[status] += 1;
  });
  return counts;
}

/** Etiqueta legible para mostrar en UI */
export function statusLabel(status) {
  switch (normalizeStatus(status)) {
    case STATUS.PENDING:     return 'Pendiente';
    case STATUS.IN_PROGRESS: return 'En proceso';
    case STATUS.IN_REVIEW:   return 'En revisión';
    case STATUS.CLOSED:      return 'Cerrada';
    default:                 return status || 'Desconocido';
  }
}

/** Icono (Ionicons) de cada estado */
export function statusIcon(status) {
  switch (normalizeStatus(status)) {
    case STATUS.IN_PROGRESS: return 'play-circle-outline';
    case STATUS.IN_REVIEW:   return 'eye-outline';
    case STATUS.CLOSED:      return 'checkmark-circle-outline';
    default:                 return 'time-outline';
  }
}

/** Prioridades: mismos nombres y colores en Inicio, Bandeja, Tablero y Calendario */
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };
const PRIORITY_ICONS = { baja: 'arrow-down', media: 'remove', alta: 'arrow-up', critica: 'alert' };

export const priorityLabel = (priority) => PRIORITY_LABELS[priority] || PRIORITY_LABELS.media;
export const priorityIcon = (priority) => PRIORITY_ICONS[priority] || PRIORITY_ICONS.media;

/** Color de la prioridad según el tema activo (legible como texto sobre una tarjeta) */
export function priorityColor(priority, theme) {
  switch (priority) {
    case 'critica':
    case 'alta': return theme.priorityHigh;
    case 'baja': return theme.priorityLow;
    default:     return theme.warningText;
  }
}

/** Color del estado según el tema activo */
export function statusColor(status, theme) {
  switch (normalizeStatus(status)) {
    case STATUS.IN_PROGRESS: return theme.statusInProgress;
    case STATUS.IN_REVIEW:   return theme.statusReview;
    case STATUS.CLOSED:      return theme.statusClosed;
    default:                 return theme.statusPending;
  }
}
