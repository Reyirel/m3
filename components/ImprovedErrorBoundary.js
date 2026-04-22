/**
 * 🔴 Improved ErrorBoundary
 * 
 * Captura errores de React y muestra UI de recuperación
 * Integración con Logger para tracking
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import logger from '../services/Logger';

class ImprovedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log del error
    logger.error(
      'ErrorBoundary',
      `React Error: ${error.toString()}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1,
      }
    );

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Alertar si hay demasiados errores
    if (this.state.errorCount > 5) {
      logger.warn(
        'ErrorBoundary',
        'Demasiados errores detectados, app puede estar inestable'
      );
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  // Forzar cierre de pantalla problemática
  goToHome = () => {
    this.resetError();
    if (this.props.navigation) {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, errorCount } = this.state;

      return (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="warning" size={48} color="#FF6B6B" />
            <Text style={styles.title}>Algo salió mal</Text>
            <Text style={styles.subtitle}>
              Error #{errorCount} detectado
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.content}>
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Mensaje de Error:</Text>
              <Text style={styles.errorMessage}>
                {error?.toString()}
              </Text>
            </View>

            {/* Detalles técnicos (si expandido) */}
            {showDetails && errorInfo && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Detalles Técnicos:</Text>
                <Text style={styles.detailsText}>
                  {errorInfo.componentStack}
                </Text>
              </View>
            )}

            {/* Sugerencias */}
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionTitle}>Qué puedes hacer:</Text>
              <Text style={styles.suggestionText}>
                • Intenta actualizar la pantalla{'\n'}
                • Cierra la app y vuelve a abrirla{'\n'}
                • Verifica tu conexión{'\n'}
                • Contacta soporte si persiste
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.toggleDetails}
            >
              <Text style={styles.secondaryText}>
                {showDetails ? 'Ocultar' : 'Ver'} Detalles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.resetError}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.primaryText}>Intentar de Nuevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={this.goToHome}
            >
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.dangerText}>Ir a Inicio</Text>
            </TouchableOpacity>
          </View>

          {/* Error Count Warning */}
          {errorCount > 3 && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle" size={20} color="#FFA500" />
              <Text style={styles.warningText}>
                Múltiples errores detectados. Por favor, reinicia.
              </Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftColor: '#FF6B6B',
    borderLeftWidth: 4,
  },
  errorTitle: {
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#C62828',
    fontFamily: 'Courier New',
    lineHeight: 18,
  },
  detailsBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier New',
    lineHeight: 16,
  },
  suggestionBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftColor: '#4CAF50',
    borderLeftWidth: 4,
  },
  suggestionTitle: {
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dangerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopColor: '#FFA500',
    borderTopWidth: 1,
  },
  warningText: {
    flex: 1,
    color: '#E65100',
    fontSize: 13,
    fontWeight: '500',
  },
});

// HOC para wrappear screens
export function withErrorBoundary(Component) {
  return (props) => (
    <ImprovedErrorBoundary navigation={props.navigation}>
      <Component {...props} />
    </ImprovedErrorBoundary>
  );
}

export default ImprovedErrorBoundary;

/**
 * USAGE:
 * 
 * // Opción 1: Wrapper directo
 * <ImprovedErrorBoundary>
 *   <MyScreen />
 * </ImprovedErrorBoundary>
 * 
 * // Opción 2: HOC
 * export default withErrorBoundary(MyScreen);
 * 
 * // Opción 3: Envolver navigator (App.js)
 * <ImprovedErrorBoundary navigation={navigationRef}>
 *   <NavigationContainer ref={navigationRef}>
 *     ...
 *   </NavigationContainer>
 * </ImprovedErrorBoundary>
 */
