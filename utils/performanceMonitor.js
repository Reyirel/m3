/**
 * performanceMonitor.js
 * 
 * Web Vitals and Performance Monitoring
 * Tracks LCP, FID, CLS, TTI, and custom metrics
 * 
 * 📊 Impacto Esperado: Visibility into performance issues
 * 
 * Uso:
 * import { initPerformanceMonitoring, reportWebVitals } from './utils/performanceMonitor';
 * 
 * initPerformanceMonitoring();
 * reportWebVitals();
 */

import { Platform } from 'react-native';

/**
 * Web Vitals thresholds
 * Valores de Google para "Good" performance
 */
export const VITALS_THRESHOLDS = {
  LCP: 2500,        // Largest Contentful Paint (ms)
  FID: 100,         // First Input Delay (ms)
  CLS: 0.1,         // Cumulative Layout Shift (score)
  TTFB: 800,        // Time to First Byte (ms)
  TTI: 3800,        // Time to Interactive (ms)
};

/**
 * Performance metrics storage
 */
let metricsStore = {
  lcp: [],
  fid: [],
  cls: [],
  ttfb: [],
  tti: [],
  custom: {},
  navigation: {},
};

/**
 * Initialize performance monitoring
 * Sets up observers for Web Vitals
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableLogging - Log metrics to console
 * @param {Function} options.onMetric - Callback for each metric
 * @param {string} options.endpoint - API endpoint to send metrics
 * 
 * @example
 * initPerformanceMonitoring({
 *   enableLogging: true,
 *   onMetric: (metric) => console.log(metric),
 *   endpoint: '/api/metrics'
 * });
 */
export const initPerformanceMonitoring = (options = {}) => {
  if (Platform.OS !== 'web') {
    console.log('[Performance] Monitoring disabled for non-web platform');
    return;
  }

  const { enableLogging = false, onMetric, endpoint } = options;

  // 1️⃣ Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        const metric = {
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          timestamp: lastEntry.startTime,
          good: (lastEntry.renderTime || lastEntry.loadTime) <= VITALS_THRESHOLDS.LCP,
        };

        metricsStore.lcp.push(metric);
        if (enableLogging) console.log('[LCP]', metric.value.toFixed(0), 'ms', metric.good ? '✓ Good' : '⚠ Poor');
        onMetric?.(metric);
        sendMetricToEndpoint(metric, endpoint);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('[Performance] LCP observer failed:', error);
    }
  }

  // 2️⃣ First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          const metric = {
            name: 'FID',
            value: entry.processingDuration,
            timestamp: entry.startTime,
            good: entry.processingDuration <= VITALS_THRESHOLDS.FID,
          };

          metricsStore.fid.push(metric);
          if (enableLogging) console.log('[FID]', metric.value.toFixed(0), 'ms', metric.good ? '✓ Good' : '⚠ Poor');
          onMetric?.(metric);
          sendMetricToEndpoint(metric, endpoint);
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('[Performance] FID observer failed:', error);
    }
  }

  // 3️⃣ Cumulative Layout Shift (CLS)
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;

            const metric = {
              name: 'CLS',
              value: clsValue,
              timestamp: entry.startTime,
              good: clsValue <= VITALS_THRESHOLDS.CLS,
            };

            metricsStore.cls.push(metric);
            if (enableLogging) console.log('[CLS]', clsValue.toFixed(3), metric.good ? '✓ Good' : '⚠ Poor');
            onMetric?.(metric);
            sendMetricToEndpoint(metric, endpoint);
          }
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('[Performance] CLS observer failed:', error);
    }
  }

  // 4️⃣ Time to First Byte (TTFB)
  if ('performance' in window && 'PerformanceObserver' in window) {
    try {
      const ttfbValue = performance.timing.responseStart - performance.timing.navigationStart;
      const metric = {
        name: 'TTFB',
        value: ttfbValue,
        timestamp: Date.now(),
        good: ttfbValue <= VITALS_THRESHOLDS.TTFB,
      };

      metricsStore.ttfb.push(metric);
      if (enableLogging) console.log('[TTFB]', ttfbValue.toFixed(0), 'ms', metric.good ? '✓ Good' : '⚠ Poor');
      onMetric?.(metric);
      sendMetricToEndpoint(metric, endpoint);
    } catch (error) {
      console.warn('[Performance] TTFB measurement failed:', error);
    }
  }

  // 5️⃣ Time to Interactive (TTI) - Custom measurement
  measureTimeToInteractive((ttiValue) => {
    const metric = {
      name: 'TTI',
      value: ttiValue,
      timestamp: Date.now(),
      good: ttiValue <= VITALS_THRESHOLDS.TTI,
    };

    metricsStore.tti.push(metric);
    if (enableLogging) console.log('[TTI]', ttiValue.toFixed(0), 'ms', metric.good ? '✓ Good' : '⚠ Poor');
    onMetric?.(metric);
    sendMetricToEndpoint(metric, endpoint);
  });

  console.log('[Performance] Monitoring initialized');
};

/**
 * Measure Time to Interactive
 * When the page becomes responsive to user interactions
 * 
 * @param {Function} callback - Called with TTI value
 */
const measureTimeToInteractive = (callback) => {
  if (Platform.OS !== 'web' || !('requestIdleCallback' in window)) {
    return;
  }

  const startTime = Date.now();
  const navigationStart = performance?.timing?.navigationStart || startTime;

  // Simple TTI: when requestIdleCallback is available
  requestIdleCallback(() => {
    const tti = Date.now() - navigationStart;
    callback(tti);
  }, { timeout: 5000 });
};

/**
 * Send metric to backend endpoint
 * Useful for analytics and monitoring
 * 
 * @param {Object} metric - Metric object
 * @param {string} endpoint - API endpoint
 */
const sendMetricToEndpoint = async (metric, endpoint) => {
  if (!endpoint) return;

  try {
    // Send using beacon API for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(metric));
    } else {
      // Fallback to fetch
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('[Performance] Failed to send metric:', error);
  }
};

/**
 * Mark custom performance point
 * 
 * @param {string} name - Mark name
 * @param {Object} metadata - Additional data
 * 
 * @example
 * perfMark('api-call-start', { endpoint: '/api/tasks' });
 * // ... do work ...
 * perfMark('api-call-end', { endpoint: '/api/tasks' });
 * perfMeasure('api-call', 'api-call-start', 'api-call-end');
 */
export const perfMark = (name, metadata = {}) => {
  if (Platform.OS !== 'web' || !performance?.mark) return;

  try {
    performance.mark(name);
    metricsStore.custom[name] = {
      timestamp: Date.now(),
      ...metadata,
    };
  } catch (error) {
    console.warn('[Performance] Mark failed:', name, error);
  }
};

/**
 * Measure time between two marks
 * 
 * @param {string} name - Measure name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 * @returns {number} Duration in milliseconds
 * 
 * @example
 * const duration = perfMeasure('api-call', 'api-call-start', 'api-call-end');
 */
export const perfMeasure = (name, startMark, endMark) => {
  if (Platform.OS !== 'web' || !performance?.measure) return 0;

  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    return measure?.duration || 0;
  } catch (error) {
    console.warn('[Performance] Measure failed:', name, error);
    return 0;
  }
};

/**
 * Report Web Vitals
 * Integration with common analytics services
 * 
 * @param {Function} callback - Callback for each vital
 * 
 * @example
 * reportWebVitals((vital) => {
 *   // Send to Google Analytics
 *   gtag('event', vital.name, {
 *     value: vital.value,
 *     event_category: 'Web Vitals',
 *   });
 * });
 */
export const reportWebVitals = (callback) => {
  initPerformanceMonitoring({
    enableLogging: true,
    onMetric: callback,
  });
};

