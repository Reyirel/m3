// utils/lazyLoad.js
// Utilidad para lazy loading de componentes con soporte web y móvil
import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';

/**
 * Loading fallback component por defecto
 */
const DefaultLoadingFallback = ({ message = 'Cargando...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#9F2241" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

/**
 * Error boundary específico para lazy loading
 */
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar el módulo</Text>
          <Text 
            style={styles.retryText}
            onPress={() => this.setState({ hasError: false })}
          >
            Reintentar
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * HOC para lazy loading de screens
 * @param {Function} importFn - Función que retorna import dinámico, ej: () => import('./Screen')
 * @param {Object} options - Opciones de configuración
 * @returns {React.Component} Componente lazy wrapped
 */
export function lazyScreen(importFn, options = {}) {
  const { fallback = null, loadingMessage = 'Cargando pantalla...' } = options;
  
  // En web, usar React.lazy directamente
  if (Platform.OS === 'web') {
    const LazyComponent = lazy(importFn);
    
    return function LazyScreen(props) {
      return (
        <LazyErrorBoundary>
          <Suspense fallback={fallback || <DefaultLoadingFallback message={loadingMessage} />}>
            <LazyComponent {...props} />
          </Suspense>
        </LazyErrorBoundary>
      );
    };
  }
  
  // En móvil, React.lazy también funciona con Metro bundler
  const LazyComponent = lazy(importFn);
  
  return function LazyScreen(props) {
    return (
      <LazyErrorBoundary>
        <Suspense fallback={fallback || <DefaultLoadingFallback message={loadingMessage} />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };
}

/**
 * Prefetch/preload de módulos para mejorar UX
 * @param {Function[]} importFns - Array de import functions
 */
export async function prefetchScreens(importFns) {
  try {
    await Promise.all(importFns.map(fn => fn()));
  } catch (e) {
    // Silent fail - prefetch no es crítico
  }
}

/**
 * Crear múltiples screens lazy a la vez
 * @param {Object} screens - { screenName: () => import('./Screen') }
 * @returns {Object} - { screenName: LazyComponent }
 */
export function createLazyScreens(screens) {
  const lazyScreens = {};
  
  Object.entries(screens).forEach(([name, importFn]) => {
    lazyScreens[name] = lazyScreen(importFn, { loadingMessage: `Cargando ${name}...` });
  });
  
  return lazyScreens;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9F2241',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#9F2241',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default {
  lazyScreen,
  prefetchScreens,
  createLazyScreens,
  DefaultLoadingFallback,
};
