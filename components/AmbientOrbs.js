/**
 * AmbientOrbs.js - ENHANCED LUXURY VERSION
 * Decoración ultra-premium: orbs con múltiples capas de glow animadas
 * Crea profundidad visual, movimiento sutil y efecto de luz envolvente
 * Estilo: Premium visual effect usado en Apple, Figma, Stripe interfaces
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

// Enhanced Orb con múltiples capas de glow
function EnhancedOrb({
  size,
  color,
  glowColor,
  duration,
  x,
  y,
  layers = 3,
}) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.85);
  const rotationValue = useSharedValue(0);

  useEffect(() => {
    // Animación de opacidad suave
    opacity.value = withRepeat(
      withTiming(0.65, {
        duration: duration,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true
    );

    // Animación de escala más lenta
    scale.value = withRepeat(
      withTiming(1.15, {
        duration: duration * 1.8,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    // Rotación lenta para efecto de movimiento azimuthal
    rotationValue.value = withRepeat(
      withTiming(360, {
        duration: duration * 2.5,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      // Note: rotationValue se usa solo para los halos internos
    ],
  }));

  // Renderizar múltiples capas de glow
  const glowLayers = Array(layers)
    .fill(null)
    .map((_, layerIdx) => {
      const layerOpacity = interpolate(
        opacity.value,
        [0.3, 0.65],
        [0.08 * (layers - layerIdx) / layers, 0.25 * (layers - layerIdx) / layers],
        'clamp'
      );

      return (
        <Animated.View
          key={layerIdx}
          style={[
            {
              position: 'absolute',
              width: size + layerIdx * 40,
              height: size + layerIdx * 40,
              borderRadius: (size + layerIdx * 40) / 2,
              backgroundColor: glowColor,
              left: x - (layerIdx * 20),
              top: y - (layerIdx * 20),
              opacity: layerOpacity,
            },
          ]}
        />
      );
    });

  return (
    <Animated.View style={animatedStyle}>
      {/* Glow layers */}
      {glowLayers}

      {/* Main orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            left: x,
            top: y,
          },
        ]}
      />
    </Animated.View>
  );
}

export default function AmbientOrbs({ intensity = 'medium' }) {
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  // Configurar orbs premium con capas de glow
  const getOrbs = () => {
    const baseOrbs = [
      {
        size: 240,
        color: isDark ? 'rgba(159, 34, 65, 0.12)' : 'rgba(159, 34, 65, 0.14)',
        glowColor: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.10)',
        duration: 6000,
        x: -80,
        y: -60,
        layers: 4,
      },
      {
        size: 180,
        color: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.13)',
        glowColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.08)',
        duration: 8000,
        x: width - 100,
        y: height * 0.2,
        layers: 3,
      },
      {
        size: 200,
        color: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.12)',
        glowColor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.08)',
        duration: 7000,
        x: width * 0.5 - 100,
        y: height - 150,
        layers: 4,
      },
      {
        size: 200,
        color: isDark ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.12)',
        glowColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.07)',
        duration: 9000,
        x: width * 0.2,
        y: height * 0.15,
        layers: 3,
      },
    ];

    // Extra orbs para high intensity
    if (intensity === 'high') {
      baseOrbs.push(
        {
          size: 150,
          color: isDark ? 'rgba(59, 130, 246, 0.10)' : 'rgba(59, 130, 246, 0.12)',
          glowColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.07)',
          duration: 9000,
          x: width * 0.3,
          y: height * 0.6,
          layers: 3,
        },
        {
          size: 160,
          color: isDark ? 'rgba(168, 85, 247, 0.10)' : 'rgba(168, 85, 247, 0.12)',
          glowColor: isDark ? 'rgba(168, 85, 247, 0.05)' : 'rgba(168, 85, 247, 0.07)',
          duration: 7500,
          x: width * 0.7,
          y: height * 0.4,
          layers: 3,
        },
        {
          size: 220,
          color: isDark ? 'rgba(236, 72, 153, 0.08)' : 'rgba(236, 72, 153, 0.10)',
          glowColor: isDark ? 'rgba(236, 72, 153, 0.04)' : 'rgba(236, 72, 153, 0.06)',
          duration: 8500,
          x: width * 0.85,
          y: height * 0.75,
          layers: 2,
        }
      );
    }

    return baseOrbs;
  };

  const orbs = getOrbs();

  return (
    <View style={[styles.container, StyleSheet.absoluteFill]}>
      {orbs.map((orb, idx) => (
        <EnhancedOrb key={idx} {...orb} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
    backgroundColor: 'transparent',
  },

  orb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
});
