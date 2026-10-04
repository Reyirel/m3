/**
 * Rate Limiter Service
 * Previene spam y abusos sin afectar usuarios legítimos
 * 
 * Límites default:
 * - Tasks: 10 por minuto
 * - Reports: 60 por hora
 * - Updates: 30 por minuto
 * - Deletes: 5 por minuto
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../services/Logger';

const RATE_LIMIT_KEY = 'rate_limits';
const LIMITS = {
  createTask: { count: 10, window: 60 * 1000 }, // 10 por minuto
  updateTask: { count: 30, window: 60 * 1000 }, // 30 por minuto
  deleteTask: { count: 5, window: 60 * 1000 },  // 5 por minuto
  createReport: { count: 60, window: 60 * 60 * 1000 }, // 60 por hora
  uploadImage: { count: 30, window: 60 * 1000 }, // 30 por minuto
  // Agregar más según sea necesario
};

/**
 * Verificar si una acción está permitida
 * @param {string} action - Nombre de la acción (createTask, updateTask, etc)
 * @returns {object} { allowed: boolean, remainingTime: number, retryAfter: number }
 */
export const checkRateLimit = async (action) => {
  try {
    const limit = LIMITS[action];
    if (!limit) {
      // Acción sin límite definido
      return { allowed: true };
    }

    const now = Date.now();
    const key = `${RATE_LIMIT_KEY}_${action}`;

    // Obtener histórico de esta acción
    const stored = await AsyncStorage.getItem(key);
    let history = stored ? JSON.parse(stored) : [];

    // Filtrar eventos dentro de la ventana de tiempo
    history = history.filter(timestamp => now - timestamp < limit.window);

    // Verificar si se excedió el límite
    if (history.length >= limit.count) {
      // Encontrar cuándo expira el evento más viejo
      const oldestEvent = Math.min(...history);
      const retryAfter = Math.ceil((oldestEvent + limit.window - now) / 1000);

      logger.warn('RateLimiter', `Rate limit exceeded: ${action}`, {
        action,
        count: history.length,
        limit: limit.count,
        retryAfter
      });

      return {
        allowed: false,
        remainingTime: retryAfter * 1000,
        retryAfter, // en segundos
        message: `Intenta en ${retryAfter}s`
      };
    }

    // Agregar timestamp actual
    history.push(now);
    await AsyncStorage.setItem(key, JSON.stringify(history));

    // Cuántas acciones más quedan en esta ventana
    const remaining = limit.count - history.length;

    return {
      allowed: true,
      remaining,
      limit: limit.count
    };
  } catch (error) {
    logger.error('RateLimiter', 'Rate limit check failed', error);
    // En caso de error, permitir la acción (fail-open)
    return { allowed: true };
  }
};

/**
 * Ejecutar acción respetando rate limit
 * @param {string} action - Nombre de la acción
 * @param {function} asyncFn - Función async a ejecutar
 * @returns {Promise} Resultado de asyncFn
 */
export const withRateLimit = async (action, asyncFn) => {
  const check = await checkRateLimit(action);

  if (!check.allowed) {
    const error = new Error('Rate limit exceeded');
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.retryAfter = check.retryAfter;
    error.message = check.message || `Rate limit exceeded. ${check.retryAfter}s`;
    throw error;
  }

  try {
    return await asyncFn();
  } catch (error) {
    throw error;
  }
};

/**
 * Resetear límites (admin/testing)
 */
export const clearRateLimits = async (action = null) => {
  try {
    if (action) {
      const key = `${RATE_LIMIT_KEY}_${action}`;
      await AsyncStorage.removeItem(key);
    } else {
      // Limpiar todos
      const keys = await AsyncStorage.getAllKeys();
      const limitKeys = keys.filter(k => k.startsWith(RATE_LIMIT_KEY));
      await AsyncStorage.multiRemove(limitKeys);
    }
    return true;
  } catch (error) {
    logger.error('RateLimiter', 'Error clearing rate limits', error);
    return false;
  }
};

/**
 * Obtener estadísticas de límites
 */
export const getRateLimitStats = async () => {
  try {
    const stats = {};

    for (const [action, limit] of Object.entries(LIMITS)) {
      const key = `${RATE_LIMIT_KEY}_${action}`;
      const stored = await AsyncStorage.getItem(key);
      const history = stored ? JSON.parse(stored) : [];

      // Filtrar vigentes
      const now = Date.now();
      const active = history.filter(ts => now - ts < limit.window);

      stats[action] = {
        used: active.length,
        limit: limit.count,
        percentage: Math.round((active.length / limit.count) * 100),
        windowMs: limit.window
      };
    }

    return stats;
  } catch (error) {
    logger.error('RateLimiter', 'Error getting rate limit stats', error);
    return {};
  }
};

/**
 * Configurar límites personalizados (runtime)
 */
export const setRateLimit = (action, count, windowMs) => {
  if (LIMITS[action]) {
    LIMITS[action] = { count, window: windowMs };
    console.log(`[RateLimit] ${action}: ${count}/${Math.round(windowMs / 1000)}s`);
  } else {
    console.warn(`[RateLimit] Action "${action}" not found`);
  }
};

export default {
  checkRateLimit,
  withRateLimit,
  clearRateLimits,
  getRateLimitStats,
  setRateLimit,
  LIMITS
};
