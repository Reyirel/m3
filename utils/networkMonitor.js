/**
 * Network Quality Monitor
 * Detecta calidad de conexión en tiempo real
 * 
 * Métricas:
 * - Latencia (ping)
 * - Velocidad de descarga
 * - Tipo de conexión
 * - Estado online/offline
 */

import NetInfo from '@react-native-community/netinfo';
import * as productionLogger from './productionLogger';

const MONITOR_INTERVAL = 30 * 1000; // Check cada 30s
const PING_TIMEOUT = 5000;

// Thresholds de calidad
const QUALITY_THRESHOLDS = {
  excellent: { latency: 50, download: 10 },    // < 50ms, > 10 Mbps
  good: { latency: 150, download: 5 },         // < 150ms, > 5 Mbps
  fair: { latency: 500, download: 2 },         // < 500ms, > 2 Mbps
  poor: { latency: 1000, download: 0.5 },      // < 1000ms, > 0.5 Mbps
  offline: { latency: Infinity, download: 0 }
};

class NetworkQualityMonitor {
  constructor() {
    this.state = {
      isOnline: true,
      type: 'unknown',
      quality: 'unknown',
      latency: null,
      downloadSpeed: null,
      lastCheck: null,
      connectionHistory: []
    };
    
    this.monitoring = false;
    this.monitorInterval = null;
    this.netInfoUnsubscribe = null;
    this.listeners = [];
  }

  /**
   * Iniciar monitoreo
   */
  async start() {
    if (this.monitoring) return;

    this.monitoring = true;
    console.log('[NetworkMonitor] Starting...');

    // Check inicial
    await this.checkConnection();

    // Check periódico
    this.monitorInterval = setInterval(async () => {
      await this.checkConnection();
    }, MONITOR_INTERVAL);

    // Listener de cambios en estado de conexión
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      this.state.isOnline = state.isConnected;
      this.state.type = state.type;
      this.notifyListeners();
    });
  }

  /**
   * Detener monitoreo
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.monitoring = false;
  }

  /**
   * Chequeo de conexión actual
   */
  async checkConnection() {
    try {
      const state = await NetInfo.fetch();

      this.state.isOnline = state.isConnected ?? false;
      this.state.type = state.type ?? 'unknown';
      this.state.lastCheck = Date.now();

      if (!this.state.isOnline) {
        this.state.quality = 'offline';
        this.state.latency = null;
        this.state.downloadSpeed = null;
      } else {
        // Measure latency
        await this.measureLatency();

        // Estimate download speed (simple)
        await this.estimateDownloadSpeed();

        // Calculate quality
        this.calculateQuality();
      }

      this.recordToHistory();
      this.notifyListeners();
    } catch (error) {
      productionLogger.logError('Network check failed', error);
    }
  }

  /**
   * Medir latencia con ping
   */
  async measureLatency() {
    try {
      const startTime = Date.now();

      // Ping a Firebase (lightweight endpoint)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), PING_TIMEOUT);

      // Use httpbin.org which supports CORS
      const response = await fetch('https://httpbin.org/get', {
        signal: abortController.signal,
        method: 'HEAD',
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.state.latency = Date.now() - startTime;
      }
    } catch (error) {
      // Timeout o error, marcar como latencia alta
      this.state.latency = PING_TIMEOUT;
    }
  }

  /**
   * Estimar velocidad de descarga
   * Descargando archivo pequeño y midiendo tiempo
   */
  async estimateDownloadSpeed() {
    try {
      // Use CORS-compatible endpoint for speed test
      const testUrl = 'https://httpbin.org/bytes/1024';
      const startTime = Date.now();
      const _startBytes = 0;

      const response = await fetch(testUrl, { method: 'HEAD' });
      const contentLength = parseInt(response.headers.get('content-length'), 10);

      if (contentLength > 0) {
        const duration = (Date.now() - startTime) / 1000; // segundos
        const megabytes = contentLength / (1024 * 1024);
        this.state.downloadSpeed = (megabytes / duration);
      }
    } catch (error) {
      // Unable to measure, estimate from latency
      if (this.state.latency && this.state.latency < 100) {
        this.state.downloadSpeed = 10; // Good connection
      } else if (this.state.latency && this.state.latency < 500) {
        this.state.downloadSpeed = 2;
      } else {
        this.state.downloadSpeed = 0.5;
      }
    }
  }

  /**
   * Calcular quality basado en métricas
   */
  calculateQuality() {
    if (!this.state.isOnline) {
      this.state.quality = 'offline';
      return;
    }

    const latency = this.state.latency ?? Infinity;
    const speed = this.state.downloadSpeed ?? 0;

    // Evaluar de mejor a peor
    if (latency < QUALITY_THRESHOLDS.excellent.latency && 
        speed > QUALITY_THRESHOLDS.excellent.download) {
      this.state.quality = 'excellent';
    } else if (latency < QUALITY_THRESHOLDS.good.latency && 
               speed > QUALITY_THRESHOLDS.good.download) {
      this.state.quality = 'good';
    } else if (latency < QUALITY_THRESHOLDS.fair.latency && 
               speed > QUALITY_THRESHOLDS.fair.download) {
      this.state.quality = 'fair';
    } else if (latency < QUALITY_THRESHOLDS.poor.latency && 
               speed > QUALITY_THRESHOLDS.poor.download) {
      this.state.quality = 'poor';
    } else {
      this.state.quality = 'offline';
    }
  }

  /**
   * Guardar histórico para análisis
   */
  recordToHistory() {
    this.state.connectionHistory.push({
      timestamp: Date.now(),
      quality: this.state.quality,
      latency: this.state.latency,
      speed: this.state.downloadSpeed,
      isOnline: this.state.isOnline
    });

    // Mantener últimos 100 registros
    if (this.state.connectionHistory.length > 100) {
      this.state.connectionHistory.shift();
    }
  }

  /**
   * Obtener estado actual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Obtener descripción legible de la conexión
   */
  getDescription() {
    const { quality, latency, downloadSpeed, isOnline } = this.state;

    if (!isOnline) return 'Offline';

    const latencyStr = latency ? `${Math.round(latency)}ms` : 'N/A';
    const speedStr = downloadSpeed ? `${downloadSpeed.toFixed(1)}Mbps` : 'N/A';

    const descriptions = {
      excellent: `Excelente (${latencyStr}, ${speedStr})`,
      good: `Bueno (${latencyStr}, ${speedStr})`,
      fair: `Regular (${latencyStr}, ${speedStr})`,
      poor: `Lento (${latencyStr}, ${speedStr})`,
      offline: 'Offline'
    };

    return descriptions[quality] || `Desconocido`;
  }

  /**
   * Suscribirse a cambios
   */
  onStatusChange(callback) {
    this.listeners.push(callback);

    // Notificar inmediatamente con estado actual
    callback(this.getState());

    // Retornar unsubscribe
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in network monitor listener:', error);
      }
    });
  }

  /**
   * Obtener estadísticas históricas
   */
  getStats() {
    const history = this.state.connectionHistory;
    if (history.length === 0) return null;

    const latencies = history
      .filter(h => h.latency !== null)
      .map(h => h.latency);

    const speeds = history
      .filter(h => h.speed !== null)
      .map(h => h.speed);

    const avgLatency = latencies.length ? 
      latencies.reduce((a, b) => a + b) / latencies.length : null;

    const avgSpeed = speeds.length ? 
      speeds.reduce((a, b) => a + b) / speeds.length : null;

    const downtime = history.length > 0 
      ? (history.filter(h => !h.isOnline).length / history.length * 100)
      : 0;

    return {
      avgLatency: avgLatency ? Math.round(avgLatency) : null,
      avgSpeed: avgSpeed ? avgSpeed.toFixed(1) : null,
      minLatency: latencies.length ? Math.min(...latencies) : null,
      maxLatency: latencies.length ? Math.max(...latencies) : null,
      downtime: downtime.toFixed(1),
      samples: history.length
    };
  }
}

// Instancia global
const monitor = new NetworkQualityMonitor();

export {
  NetworkQualityMonitor,
  monitor
};

export const startNetworkMonitoring = () => monitor.start();
export const stopNetworkMonitoring = () => monitor.stop();
export const getNetworkState = () => monitor.getState();
export const getNetworkDescription = () => monitor.getDescription();
export const subscribeToNetworkStatus = (callback) => monitor.onStatusChange(callback);
export const getNetworkStats = () => monitor.getStats();

export default monitor;
