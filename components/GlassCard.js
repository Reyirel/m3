/**
 * GlassCard.js
 * Card con glassmorfismo: blur, gradiente sutil, inner highlight rim
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassCard({
  children,
  style,
  intensity = 'soft', // 'soft', 'medium', 'strong'
  borderColor,
  padding = 16,
  borderRadius = 16,
  showRim = true, // Inner highlight rim
  rimColor,
  glow = false, // Sombra externa glow
}) {
  const { theme, isDark } = useTheme();

  // Determinar intensidad del blur
  const blurIntensity = {
    soft: isDark ? 20 : 40,
    medium: isDark ? 40 : 60,
    strong: isDark ? 60 : 80,
  }[intensity];

  // Color del borde
  const defaultBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.3)';

  // Color del rim luminoso
  const defaultRimColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.5)';

  return (
    <View
      style={[
        styles.container,
        glow && {
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
        },
        style,
      ]}
    >
      {/* Blur background */}
      <BlurView intensity={blurIntensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

      {/* Gradient overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(30, 41, 59, 0.3)'
              : 'rgba(255, 255, 255, 0.4)',
          },
        ]}
      />

      {/* Inner rim glow - borde luminoso superior */}
      {showRim && (
        <View
          style={[
            styles.rimGlow,
            {
              backgroundColor: rimColor || defaultRimColor,
              borderRadius: borderRadius,
            },
          ]}
        />
      )}

      {/* Border */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: borderRadius,
            borderWidth: 1,
            borderColor: borderColor || defaultBorderColor,
          },
        ]}
      />

      {/* Contenido */}
      <View
        style={[
          styles.content,
          {
            padding: padding,
            borderRadius: borderRadius,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },

  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 1,
  },

  content: {
    zIndex: 2,
  },
});
