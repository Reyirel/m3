import { isClosed } from './taskStatus';

/**
 * Utilidades para manejo de fechas y timestamps de Firebase
 */

/**
 * Convierte un timestamp de Firebase (Firestore.Timestamp o número) a milisegundos
 * @param {Object|number|Date|null} timestamp - Timestamp de Firebase, número (ms) o Date
 * @returns {number|null} Milisegundos desde epoch, o null si no hay valor
 */
export const toMs = (timestamp) => {
  if (timestamp === null || timestamp === undefined) return null;
  
  // Firebase Timestamp con método toMillis()
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // Firebase Timestamp con propiedad seconds
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds * 1000;
  }
  
  // Ya es un número (milisegundos)
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // Es una instancia de Date
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  // String de fecha - intentar parsear
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
};

/**
 * Compara si un timestamp es anterior a otro
 * @param {Object|number|Date} timestamp - Timestamp a comparar
 * @param {number} compareMs - Milisegundos para comparar (default: Date.now())
 * @returns {boolean} true si timestamp < compareMs
 */
export const isBefore = (timestamp, compareMs = Date.now()) => {
  const ms = toMs(timestamp);
  return ms !== null && ms < compareMs;
};

/**
 * Compara si un timestamp es posterior a otro
 * @param {Object|number|Date} timestamp - Timestamp a comparar
 * @param {number} compareMs - Milisegundos para comparar (default: Date.now())
 * @returns {boolean} true si timestamp > compareMs
 */
export const isAfter = (timestamp, compareMs = Date.now()) => {
  const ms = toMs(timestamp);
  return ms !== null && ms > compareMs;
};

/**
 * Verifica si una tarea está vencida
 * @param {Object} task - Tarea con dueAt y status
 * @returns {boolean} true si la tarea está vencida y no cerrada
 */
export const isOverdue = (task) => {
  if (!task.dueAt) return false;
  if (isClosed(task.status)) return false;
  return isBefore(task.dueAt);
};

/**
 * Calcula la diferencia en milisegundos entre dos timestamps
 * @param {Object|number|Date} end - Timestamp final
 * @param {Object|number|Date} start - Timestamp inicial
 * @returns {number} Diferencia en milisegundos
 */
export const diffMs = (end, start) => {
  const endMs = toMs(end);
  const startMs = toMs(start);
  if (endMs === null || startMs === null) return 0;
  return endMs - startMs;
};

/**
 * Calcula la diferencia en días entre dos timestamps
 * @param {Object|number|Date} end - Timestamp final
 * @param {Object|number|Date} start - Timestamp inicial
 * @returns {number} Diferencia en días (redondeado hacia arriba)
 */
export const diffDays = (end, start) => {
  const ms = diffMs(end, start);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

/**
 * Convierte timestamp a Date object
 * @param {Object|number|Date} timestamp - Timestamp de Firebase o número
 * @returns {Date|null} Date object o null si no hay valor
 */
export const toDate = (timestamp) => {
  const ms = toMs(timestamp);
  return ms !== null ? new Date(ms) : null;
};

export default {
  toMs,
  isBefore,
  isAfter,
  isOverdue,
  diffMs,
  diffDays,
  toDate
};
