/**
 * 🎯 LoadingState.js - Componente de estado de carga reutilizable
 * 
 * Proporciona UI diseñada para mostrar:
 * - Loading spinner durante operaciones
 * - Skeleton loader para contenido
 * - Timeout graceful si la carga tarda demasiado
 * - Feedback visual y accesibilidad
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoadingState({
  visible = true,
  message = 'Cargando...',
  subMessage = null,
  timeout = 10000, // 10 segundos
  onTimeout = null,
  size = 'large',
  variant = 'spinner', // spinner | skeleton | progress
  progress = 0, // 0-1 para progress variant
  showTimeout = true,
}) {
  const { theme, isDark } = useTheme();
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timeout management
  useEffect(() => {
    if (!visible || isTimedOut) return;

    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      setIsTimedOut(true);
      onTimeout?.();
    }, timeout);

    // Update elapsed time every 100ms
    const intervalId = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);

      // Show timeout warning at 80% of timeout
      if (elapsed > timeout / 1000 * 0.8) {
        // Could show warning UI here
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [visible, timeout, onTimeout, isTimedOut]);

  if (!visible) return null;

  if (isTimedOut && showTimeout) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.timeoutContent}>
          <View style={[styles.iconBox, { backgroundColor: theme.warningAlpha }]}>
            <Ionicons name="time-outline" size={48} color={theme.warning} />
          </View>
          <Text
            style={[
              styles.timeoutTitle,
              { color: theme.text, marginTop: 24 },
            ]}
            accessibilityLabel="La operación está tomando más tiempo de lo esperado"
          >
            Está tomando más tiempo...
          </Text>
          <Text
            style={[
              styles.timeoutMessage,
              { color: theme.textSecondary, marginTop: 12 },
            ]}
          >
            {`Tiempo transcurrido: ${elapsedTime}s`}
          </Text>
          <Text
            style={[
              styles.timeoutHint,
              { color: theme.textTertiary, marginTop: 8 },
            ]}
          >
            Por favor espera o intenta nuevamente más tarde
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.bg }]}
      accessible={true}
      accessibilityLabel="Cargando contenido"
      accessibilityHint={message}
      accessibilityLiveRegion="polite"
    >
      {variant === 'spinner' && (
        <SpinnerLoader
          size={size}
          message={message}
          subMessage={subMessage}
          theme={theme}
          elapsedTime={elapsedTime}
        />
      )}

      {variant === 'skeleton' && (
        <SkeletonLoader theme={theme} isDark={isDark} />
      )}

      {variant === 'progress' && (
        <ProgressLoader
          progress={progress}
          message={message}
          theme={theme}
          elapsedTime={elapsedTime}
        />
      )}
    </View>
  );
}

/**
 * 🔄 Spinner básico con mensaje
 */
function SpinnerLoader({ size, message, subMessage, theme, elapsedTime }) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.spinnerContent}>
      <ActivityIndicator size={size} color={theme.primary} />

      <Text
        style={[
          styles.message,
          { color: theme.text, marginTop: 20 },
        ]}
      >
        {message}
      </Text>

      {subMessage && (
        <Text
          style={[
            styles.subMessage,
            { color: theme.textSecondary, marginTop: 8 },
          ]}
        >
          {subMessage}
        </Text>
      )}

      {elapsedTime > 3 && (
        <Text
          style={[
            styles.timeHint,
            { color: theme.textTertiary, marginTop: 12 },
          ]}
        >
          {`Cargando... ${elapsedTime}s`}
        </Text>
      )}
    </View>
  );
}

/**
 * 💀 Skeleton loader para contenido
 */
function SkeletonLoader({ theme, isDark }) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonContent}>
      {[...Array(3)].map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.skeletonLine,
            {
              backgroundColor: isDark ? theme.glass : theme.bgSecondary,
              opacity,
              marginBottom: i < 2 ? 16 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * 📊 Progress bar loader
 */
function ProgressLoader({ progress, message, theme, elapsedTime }) {
  const progressAnim = React.useRef(new Animated.Value(progress)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContent}>
      <Text
        style={[
          styles.message,
          { color: theme.text, marginBottom: 20 },
        ]}
      >
        {message}
      </Text>

      {/* Progress bar */}
      <View
        style={[
          styles.progressBar,
          { backgroundColor: theme.glassBorder },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.primary,
              width: progressWidth,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.progressPercent,
          { color: theme.textSecondary, marginTop: 12 },
        ]}
      >
        {`${Math.round(progress * 100)}%`}
      </Text>

      {elapsedTime > 3 && (
        <Text
          style={[
            styles.timeHint,
            { color: theme.textTertiary, marginTop: 12 },
          ]}
        >
          {`${elapsedTime}s transcurridos`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  spinnerContent: {
    alignItems: 'center',
  },
  skeletonContent: {
    width: '100%',
    maxWidth: 300,
  },
  progressContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  timeHint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeoutContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeoutMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  timeoutHint: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export { SpinnerLoader, SkeletonLoader, ProgressLoader };
