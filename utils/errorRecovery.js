/**
 * Error Recovery Service
 * Retry automático con backoff exponencial + jitter
 * 
 * Estrategia:
 * - Reintentos: 1s → 2s → 4s → 8s → fallo
 * - Jitter: ±20% para evitar thundering herd
 * - Max 4 reintentos antes de fallar
 */

import * as productionLogger from './productionLogger';

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_INITIAL_DELAY = 1000; // 1s
const DEFAULT_MAX_DELAY = 30000; // 30s
const JITTER_FACTOR = 0.2; // ±20%

// Errores que SÍ se deben reintentar
const RETRYABLE_ERRORS = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'FIRESTORE_UNAVAILABLE',
  'PERMISSION_DENIED', // A veces es temporal
  'DEADLINE_EXCEEDED',
  'UNAVAILABLE',
  'SERVICE_UNAVAILABLE'
];

// Errores que NO se deben reintentar (fallos permanentes)
const _NON_RETRYABLE_ERRORS = [
  'INVALID_ARGUMENT',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED', // Después de algunos reintentos
  'FAILED_PRECONDITION',
  'OUT_OF_RANGE',
  'UNIMPLEMENTED'
];

/**
 * Determinar si un error es reintentable
 */
const isRetryable = (error, attemptNumber = 1) => {
  const code = error?.code || error?.message || '';
  
  // Errores de red siempre son reintentables
  if (code.includes('Network') || code.includes('NETWORK')) {
    return true;
  }

  // Permitir PERMISSION_DENIED en primeros 2 intentos (puede ser temporal)
  if (code.includes('PERMISSION_DENIED') && attemptNumber < 2) {
    return true;
  }

  // Verificar lista blanca
  return RETRYABLE_ERRORS.some(retryable => code.includes(retryable));
};

/**
 * Calcular delay con backoff exponencial y jitter
 * @param {number} attemptNumber - Número de intento (0, 1, 2, ...)
 * @returns {number} Milisegundos a esperar
 */
const calculateDelay = (attemptNumber) => {
  // Backoff exponencial: 2^n * initial_delay
  const exponentialDelay = DEFAULT_INITIAL_DELAY * Math.pow(2, attemptNumber);
  
  // Limitar a máximo
  const cappedDelay = Math.min(exponentialDelay, DEFAULT_MAX_DELAY);
  
  // Agregar jitter: ±20%
  const jitter = cappedDelay * JITTER_FACTOR;
  const randomJitter = (Math.random() * 2 - 1) * jitter; // [-jitter, +jitter]
  
  return Math.max(100, cappedDelay + randomJitter); // Mínimo 100ms
};

/**
 * Esperar con sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ejecutar función con reintentos automáticos
 * @param {function} asyncFn - Función async a ejecutar
 * @param {string} operationName - Nombre de la operación (para logging)
 * @param {object} options - { maxRetries, initialDelay, maxDelay, onRetry }
 * @returns {Promise}
 */
export const withRetry = async (
  asyncFn,
  operationName = 'Operation',
  options = {}
) => {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const onRetry = options.onRetry; // callback cuando se reintenta

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await asyncFn();
      
      if (attempt > 0) {
        productionLogger.logInfo(`${operationName} succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error;

      // Verificar si es reintentable
      if (!isRetryable(error, attempt)) {
        productionLogger.logError(
          `${operationName} failed with non-retryable error`,
          error,
          { attempt, operationName }
        );
        throw error;
      }

      // Si fue el último intento, fallar
      if (attempt === maxRetries) {
        productionLogger.logError(
          `${operationName} failed after ${maxRetries} retries`,
          error,
          { attempt, maxRetries, operationName }
        );
        throw error;
      }

      // Calcular tiempo de espera
      const delay = calculateDelay(attempt);
      const delaySeconds = Math.round(delay / 1000);

      productionLogger.logWarn(`${operationName} failed, retrying in ${delaySeconds}s`, {
        attempt,
        maxRetries,
        error: error.message,
        delay
      });

      // Callback opcional
      if (onRetry) {
        onRetry({ attempt, maxRetries, delay, error });
      }

      // Esperar antes de reintentar
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Wrapper alternativo: exponential backoff sin callback
 */
export const exponentialBackoff = (asyncFn, maxRetries = 4) => {
  return withRetry(asyncFn, 'ExponentialBackoff', { maxRetries });
};

/**
 * Para operaciones críticas donde no podemos fallar completamente
 * Intenta 5 veces con delays más agresivos
 */
export const aggressiveRetry = (asyncFn, operationName = 'Critical Operation') => {
  return withRetry(asyncFn, operationName, {
    maxRetries: 5,
    initialDelay: 500 // Empezar más rápido
  });
};

/**
 * Para sincronización de reportes offline
 * Reintentos muy agresivos en background
 */
export const backgroundRetry = async (asyncFn, operationName, maxDuration = 60000) => {
  const startTime = Date.now();
  const maxRetries = 15; // Muchos intentos

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Si pasó max duration, parar
    if (Date.now() - startTime > maxDuration) {
      productionLogger.logWarn(`${operationName} retry timeout after ${maxDuration}ms`, {
        attempt,
        maxRetries
      });
      throw new Error('Background retry timeout');
    }

    try {
      const result = await asyncFn();
      productionLogger.logInfo(`${operationName} succeeded on background retry`, {
        attempt,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      if (!isRetryable(error, attempt)) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = calculateDelay(attempt);
      await sleep(delay);
    }
  }
};

/**
 * Circuit Breaker simple para proteger de cascadas de fallos
 * Después de N fallos, parar de intentar temporalmente
 */
class CircuitBreaker {
  constructor(operationName, failureThreshold = 5, resetTimeout = 60000) {
    this.operationName = operationName;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN
    this.openedAt = null;
  }

  async execute(asyncFn) {
    if (this.state === 'OPEN') {
      // Verificar si puede intentar reset
      if (Date.now() - this.openedAt > this.resetTimeout) {
        console.log(`[CircuitBreaker] ${this.operationName} attempting reset`);
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.operationName}`);
      }
    }

    try {
      const result = await asyncFn();

      // Éxito: resetear
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log(`[CircuitBreaker] ${this.operationName} recovered`);
      }

      return result;
    } catch (error) {
      this.failureCount++;

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.openedAt = Date.now();
        productionLogger.logCritical(
          `Circuit breaker OPEN: ${this.operationName}`,
          error,
          { failureCount: this.failureCount }
        );
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }
}

export { CircuitBreaker };

export default {
  withRetry,
  exponentialBackoff,
  aggressiveRetry,
  backgroundRetry,
  CircuitBreaker,
  isRetryable,
  calculateDelay
};
