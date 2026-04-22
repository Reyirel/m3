/**
 * 🔍 Logger Service - Centralizado
 * 
 * Gestiona logs, errores y analytics en un solo lugar
 * Mejora debugging, monitoreo y diagnostics
 */

import { Platform } from 'react-native';

class Logger {
  constructor() {
    this.isDev = __DEV__;
    this.enableRemote = false; // Cambiar a true para enviar a servicio remoto
    this.logsBuffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Log nivel INFO - Eventos normales
   */
  info(module, message, data = {}) {
    const log = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      module,
      message,
      data,
      platform: Platform.OS,
    };

    this._processLog(log);
  }

  /**
   * Log nivel WARNING - Eventos inesperados pero manejados
   */
  warn(module, message, data = {}) {
    const log = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      module,
      message,
      data,
      platform: Platform.OS,
    };

    this._processLog(log);
  }

  /**
   * Log nivel ERROR - Errores que necesitan atención
   */
  error(module, message, error = null, context = {}) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    const log = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      module,
      message,
      error: errorData,
      context,
      platform: Platform.OS,
    };

    this._processLog(log);
  }

  /**
   * Log nivel DEBUG - Información detallada para debugging
   */
  debug(module, message, data = {}) {
    if (!this.isDev) return;

    const log = {
      level: 'DEBUG',
      timestamp: new Date().toISOString(),
      module,
      message,
      data,
      platform: Platform.OS,
    };

    this._processLog(log);
  }

  /**
   * Log de performance - Medir tiempos
   */
  perfStart(label) {
    this._perfMarkers = this._perfMarkers || {};
    this._perfMarkers[label] = performance.now();
  }

  perfEnd(label, module = 'PERF') {
    if (!this._perfMarkers?.[label]) {
      this.warn(module, `Performance marker "${label}" no iniciado`);
      return;
    }

    const duration = performance.now() - this._perfMarkers[label];
    delete this._perfMarkers[label];

    // Advertir si tarda más de 1 segundo
    if (duration > 1000) {
      this.warn(module, `${label} tardó ${duration.toFixed(2)}ms`, { duration });
    } else {
      this.debug(module, `${label} completado en ${duration.toFixed(2)}ms`, { duration });
    }
  }

  /**
   * Log de analítica - Tracking de eventos usuario
   */
  trackEvent(eventName, properties = {}) {
    const event = {
      level: 'ANALYTICS',
      timestamp: new Date().toISOString(),
      event: eventName,
      properties,
      platform: Platform.OS,
    };

    this._processLog(event);
  }

  /**
   * Obtener logs del buffer (útil para debugging)
   */
  getBuffer() {
    return [...this.logsBuffer];
  }

  /**
   * Limpiar buffer de logs
   */
  clearBuffer() {
    this.logsBuffer = [];
  }

  /**
   * Exportar logs en JSON para debugging
   */
  exportLogs() {
    return JSON.stringify(this.logsBuffer, null, 2);
  }

  // ===== PRIVADAS =====

  _processLog(log) {
    // Agregar al buffer
    this.logsBuffer.push(log);
    if (this.logsBuffer.length > this.maxBufferSize) {
      this.logsBuffer.shift();
    }

    // Console en desarrollo
    if (this.isDev) {
      this._logToConsole(log);
    }

    // Enviar a servicio remoto (ej: Sentry, LogRocket)
    if (this.enableRemote && log.level === 'ERROR') {
      this._sendToRemote(log);
    }
  }

  _logToConsole(log) {
    const prefix = `[${log.timestamp}] ${log.module} (${log.level})`;
    const style = this._getConsoleStyle(log.level);

    switch (log.level) {
      case 'ERROR':
        console.error(`${prefix}:`, log.message);
        if (log.error) console.error('Error details:', log.error);
        if (Object.keys(log.context).length > 0) console.error('Context:', log.context);
        break;
      case 'WARN':
        console.warn(`${prefix}:`, log.message, log.data);
        break;
      case 'DEBUG':
        console.log(`${prefix}:`, log.message, log.data);
        break;
      case 'INFO':
      case 'ANALYTICS':
        console.log(`${prefix}:`, log.message);
        break;
      default:
        console.log(log);
    }
  }

  _getConsoleStyle(level) {
    const colors = {
      ERROR: '#FF6B6B',
      WARN: '#FFA500',
      INFO: '#4ECDC4',
      DEBUG: '#95E1D3',
      ANALYTICS: '#6C5CE7',
    };
    return `color: ${colors[level] || '#000'}; font-weight: bold;`;
  }

  async _sendToRemote(log) {
    try {
      // Implementar integración con Sentry, LogRocket, etc.
      // await fetch('https://your-logging-service.com/logs', {
      //   method: 'POST',
      //   body: JSON.stringify(log),
      // });
    } catch (error) {
      console.error('Failed to send remote log:', error);
    }
  }
}

// Instancia global
const logger = new Logger();

export default logger;

/**
 * USAGE EXAMPLES:
 * 
 * // Info
 * logger.info('TaskCreator', 'Task created', { taskId: '123', area: 'IT' });
 * 
 * // Warning
 * logger.warn('TasksContext', 'Multiple subscriptions detected', { count: 3 });
 * 
 * // Error
 * try {
 *   await saveTask();
 * } catch (error) {
 *   logger.error('TaskCreator', 'Failed to save task', error, { userId: user.id });
 * }
 * 
 * // Performance
 * logger.perfStart('loadTasks');
 * await loadTasksFromFirestore();
 * logger.perfEnd('loadTasks', 'TasksContext');
 * 
 * // Analytics
 * logger.trackEvent('task_created', { area: 'IT', priority: 'high' });
 * logger.trackEvent('user_login', { method: 'email' });
 * 
 * // Get logs (para debugging)
 * const logs = logger.getBuffer();
 * const exported = logger.exportLogs();
 */
