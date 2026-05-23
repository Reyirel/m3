/**
 * ScreenLoader.js
 * 
 * Wrapper para lazy loading de screens con Suspense
 * Reduce bundle inicial al cargar screens bajo demanda
 * 
 * 📊 Impacto Esperado: -40-50% bundle inicial
 * 
 * Uso:
 * import { lazyScreen } from './utils/ScreenLoader';
 * const HomeScreen = lazyScreen(() => import('./screens/HomeScreen'));
 */

import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Fallback component while screen is loading
 */
export const ScreenFallback = ({ theme = {} }) => (
  <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#fff' }]}>
    <ActivityIndicator 
      size="large" 
      color={theme?.colors?.primary || '#007AFF'} 
    />
  </View>
);

/**
 * Lazy load a screen with Suspense fallback
 * @param {Function} importFunc - Dynamic import function
 * @param {Object} options - Configuration options
 * @returns {React.ComponentType} Wrapped component with Suspense
 * 
 * @example
 * const HomeScreen = lazyScreen(() => import('./screens/HomeScreen'));
 * const DashboardScreen = lazyScreen(
 *   () => import('./screens/DashboardScreen'),
 *   { timeout: 5000 }
 * );
 */
export const lazyScreen = (importFunc, _options = {}) => {
  const LazyComponent = lazy(importFunc);
  
  const LazyScreenWrapper = (props) => (
    <Suspense fallback={<ScreenFallback theme={props.theme} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
  
  LazyScreenWrapper.displayName = `LazyScreen(${LazyComponent.displayName || 'Unknown'})`;
  
  return LazyScreenWrapper;
};

/**
 * Lazy load a component with Suspense fallback
 * Useful for heavy components like charts, reports, etc.
 * @param {Function} importFunc - Dynamic import function
 * @param {Object} fallback - Custom fallback component
 * @returns {React.ComponentType} Wrapped component with Suspense
 * 
 * @example
 * const HeavyChart = lazyComponent(() => import('./components/Heatmap'));
 * const Report = lazyComponent(
 *   () => import('./components/ComplianceReport'),
 *   <LoadingIndicator text="Generating report..." />
 * );
 */
export const lazyComponent = (importFunc, fallback = null) => {
  const LazyComponent = lazy(importFunc);
  
  const LazyComponentWrapper = (props) => (
    <Suspense fallback={fallback || <ActivityIndicator size="large" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
  
  LazyComponentWrapper.displayName = `LazyComponent(${LazyComponent.displayName || 'Unknown'})`;
  
  return LazyComponentWrapper;
};

/**
 * Preload a screen before navigation
 * Call this in onFocus or before navigation to reduce load time
 * @param {Function} importFunc - Dynamic import function
 * 
 * @example
 * useEffect(() => {
 *   preloadScreen(() => import('./screens/DashboardScreen'));
 * }, []);
 */
export const preloadScreen = async (importFunc) => {
  try {
    await importFunc();
  } catch (error) {
    if (__DEV__) console.warn('Failed to preload screen:', error);
  }
};

/**
 * Batch preload multiple screens for faster navigation
 * Call during app initialization
 * @param {Array<Function>} importFuncs - Array of dynamic import functions
 * 
 * @example
 * useEffect(() => {
 *   batchPreloadScreens([
 *     () => import('./screens/HomeScreen'),
 *     () => import('./screens/DashboardScreen'),
 *     () => import('./screens/CalendarScreen'),
 *   ]);
 * }, []);
 */
export const batchPreloadScreens = async (importFuncs) => {
  try {
    await Promise.all(importFuncs.map(preloadScreen));
    if (__DEV__) console.log('[Optimization] Screens preloaded successfully');
  } catch (error) {
    if (__DEV__) console.warn('[Optimization] Batch preload failed:', error);
  }
};

/**
 * Monitor lazy component loading performance
 * Logs loading time for debugging
 * @param {string} componentName - Name of the component
 * @param {Function} importFunc - Dynamic import function
 * @returns {React.ComponentType} Wrapped component with performance monitoring
 */
export const withPerformanceMonitoring = (componentName, importFunc) => {
  const startTime = Date.now();
  
  const LazyComponent = lazy(async () => {
    try {
      const component = await importFunc();
      const loadTime = Date.now() - startTime;
      if (__DEV__) console.log(`[Performance] ${componentName} loaded in ${loadTime}ms`);
      return component;
    } catch (error) {
      if (__DEV__) console.error(`[Performance] Failed to load ${componentName}:`, error);
      throw error;
    }
  });

  const MonitoredComponent = (props) => (
    <Suspense fallback={<ScreenFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  MonitoredComponent.displayName = `Monitored(${componentName})`;

  return MonitoredComponent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default {
  lazyScreen,
  lazyComponent,
  preloadScreen,
  batchPreloadScreens,
  withPerformanceMonitoring,
  ScreenFallback,
};
