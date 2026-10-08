/**
 * 🔴 Improved ErrorBoundary
 * 
 * Captura errores de React y muestra UI de recuperación
 * Integración con Logger para tracking
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import logger from '../services/Logger';
import { useTheme } from '../contexts/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import { ACTIVE_OPACITY } from '../theme/motion';

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

  static getDerivedStateFromError(_error) {
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
    // `navigation` es la ref del NavigationContainer. Mientras se muestra esta pantalla
    // el contenedor no está montado: en web basta con volver a la raíz para que, al
    // reconstruirse, no reabra la pantalla que falló.
    const nav = this.props.navigation?.current || this.props.navigation;
    try {
      if (nav?.isReady?.()) {
        nav.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', '/');
      }
    } catch (_e) {
      // Sin navegación disponible: al reintentar se abre la pantalla inicial
    }
    this.resetError();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.state.showDetails}
          repeated={this.state.errorCount > 3}
          onToggleDetails={this.toggleDetails}
          onRetry={this.resetError}
          onGoHome={this.goToHome}
        />
      );
    }

    return this.props.children;
  }
}

// Pantalla de error con el tema de la app. Todo va dentro de un solo desplazamiento:
// antes el mensaje quedaba entre el título y los botones y en ventanas bajas no se veía.
function ErrorScreen({ error, errorInfo, showDetails, repeated, onToggleDetails, onRetry, onGoHome }) {
  const { theme } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.errorAlpha }]}>
        <Ionicons name="alert-circle-outline" size={36} color={theme.error} />
      </View>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">Algo salió mal</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {repeated
          ? 'El error se repite. Vuelve al inicio o recarga la página.'
          : 'Puedes intentarlo de nuevo o volver al inicio. Tus datos no se pierden.'}
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={onRetry}
        activeOpacity={ACTIVE_OPACITY}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Intentar de nuevo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonOutline, { borderColor: theme.border }]}
        onPress={onGoHome}
        activeOpacity={ACTIVE_OPACITY}
        accessibilityRole="button"
      >
        <Ionicons name="home-outline" size={20} color={theme.text} />
        <Text style={[styles.buttonText, { color: theme.text }]}>Ir a Inicio</Text>
      </TouchableOpacity>

      {/* El mensaje siempre a la vista: es lo que hay que reportar */}
      <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.boxTitle, { color: theme.textSecondary }]}>Mensaje del error</Text>
        <Text selectable style={[styles.mono, { color: theme.text }]}>
          {error?.toString() || 'Sin mensaje'}
        </Text>
        {!!errorInfo?.componentStack && (
          <TouchableOpacity onPress={onToggleDetails} accessibilityRole="button" style={styles.detailsLink}>
            <Text style={[styles.detailsLinkText, { color: theme.primary }]}>
              {showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
            </Text>
          </TouchableOpacity>
        )}
        {showDetails && !!errorInfo?.componentStack && (
          <Text selectable style={[styles.mono, styles.stack, { color: theme.textSecondary }]}>
            {errorInfo.componentStack.trim()}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...TYPOGRAPHY.h2, fontWeight: '700', marginTop: SPACING.lg, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, marginBottom: SPACING.xl, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  buttonOutline: { borderWidth: 1 },
  buttonText: { ...TYPOGRAPHY.body, fontWeight: '600' },
  box: {
    alignSelf: 'stretch',
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  boxTitle: { ...TYPOGRAPHY.caption, fontWeight: '600', marginBottom: SPACING.xs },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  stack: { fontSize: 12, lineHeight: 16, marginTop: SPACING.sm },
  detailsLink: { marginTop: SPACING.md, minHeight: 32, justifyContent: 'center' },
  detailsLinkText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
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
