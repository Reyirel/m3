/**
 * PremiumCard.js
 * Tarjeta premium con glassmorphism avanzado, rim glow y sombras profundas
 * Diseño unificado para toda la app
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const PremiumCard = memo(function PremiumCard({
  children,
  style,
  padding = 16,
  borderRadius = 16,
  intensity = 'medium',
  showRim = true,
  rimColor = null,
  elevation = true,
  glowEffect = true,
}) {
  const { theme, isDark } = useTheme();

  const intensityMap = {
    light: isDark ? 30 : 40,
    medium: isDark ? 50 : 65,
    heavy: isDark ? 70 : 85,
  };

  const blurIntensity = intensityMap[intensity] || intensityMap.medium;
  const rimColorResolved = rimColor || (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)');
  const bgColor = isDark ? 'rgba(20,24,35,0.6)' : 'rgba(255,255,255,0.6)';

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          padding,
          ...(elevation && {
            shadowColor: isDark ? '#000000' : '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.2 : 0.15,
            shadowRadius: 16,
            elevation: 8,
          }),
        },
        style,
      ]}
    >
      {/* Blur glass base */}
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {/* Semi-transparent overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: bgColor,
            borderRadius,
          },
        ]}
      />

      {/* Inner rim glow - luminous border */}
      {showRim && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              borderWidth: 1.5,
              borderColor: rimColorResolved,
              pointerEvents: 'none',
            },
          ]}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Subtle glow effect for premium feel */}
      {glowEffect && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            },
          ]}
        />
      )}
    </View>
  );
});

PremiumCard.displayName = 'PremiumCard';
export default PremiumCard;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
