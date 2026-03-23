/**
 * utils/emailNormalizer.js
 * Utilidad centralizada para normalizar emails en toda la app.
 * Garantiza consistencia en comparaciones y almacenamiento.
 */

/**
 * Normaliza un email: minúsculas + trim.
 * @param {string} email
 * @returns {string} Email normalizado, o '' si es inválido
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Normaliza un array de emails.
 * @param {string[]} emails
 * @returns {string[]} Array con emails normalizados (sin nulls/vacíos)
 */
export function normalizeEmails(emails) {
  if (!Array.isArray(emails)) return [];
  return emails.map(normalizeEmail).filter(Boolean);
}

/**
 * Compara dos emails ignorando mayúsculas y espacios.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function emailsMatch(a, b) {
  return normalizeEmail(a) === normalizeEmail(b);
}

/**
 * Verifica si un email está en una lista (array o string).
 * Soporta el formato legacy donde assignedTo puede ser string.
 * @param {string|string[]} assignedTo
 * @param {string} email
 * @returns {boolean}
 */
export function isEmailInAssignment(assignedTo, email) {
  if (!assignedTo || !email) return false;
  const normalized = normalizeEmail(email);
  if (Array.isArray(assignedTo)) {
    return assignedTo.some(e => normalizeEmail(e) === normalized);
  }
  return normalizeEmail(assignedTo) === normalized;
}

export default {
  normalizeEmail,
  normalizeEmails,
  emailsMatch,
  isEmailInAssignment,
};
