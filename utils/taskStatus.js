/**
 * Valores canónicos de estado de tarea (deben coincidir con Firestore)
 */
export const STATUS = {
  PENDING: 'pendiente',
  IN_PROGRESS: 'en_proceso',
  IN_REVIEW: 'en_revision',
  CLOSED: 'cerrada',
};

/** Devuelve true para cualquier variante del estado "en progreso" */
export function isInProgress(status) {
  return (
    status === 'en_proceso' ||
    status === 'en_progreso' ||
    status === 'en-progreso' ||
    status === 'en progreso'
  );
}

/** Normaliza variantes de "en progreso" al valor canónico */
export function normalizeStatus(status) {
  if (isInProgress(status)) return STATUS.IN_PROGRESS;
  return status;
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
