/**
 * PremiumBadge.js
 * Badge ultra-premium con glow, gradientes y efectos de luz
 * Estilo: Diseño de lujo tipo Apple/Figma
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumBadge({
  label = 'Badge',
  variant = 'primary', // primary | success | warning | danger | info
  size = 'medium', // small | medium | large
  glowEffect = true,
  animated = true,
  icon = null,
  style,
}) {
  const { theme, isDark } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (glowEffect && animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [glowEffect, animated]);

  const variantConfig = {
    primary: {
      gradient: ['#6366F1', '#8B5CF6'],
      glow: '#6366F1',
      light: 'rgba(99, 102, 241, 0.15)',
    },
    success: {
      gradient: ['#10B981', '#059669'],
      glow: '#10B981',
      light: 'rgba(16, 185, 129, 0.15)',
    },
    warning: {
      gradient: ['#F59E0B', '#D97706'],
      glow: '#F59E0B',
      light: 'rgba(245, 158, 11, 0.15)',
    },
    danger: {
      gradient: ['#EF4444', '#DC2626'],
      glow: '#EF4444',
      light: 'rgba(239, 68, 68, 0.15)',
    },
    info: {
      gradient: ['#3B82F6', '#2563EB'],
      glow: '#3B82F6',
      light: 'rgba(59, 130, 246, 0.15)',
    },
  };

  const sizeConfig = {
    small: { px: 10, py: 4, fs: 11, radius: 12 },
    medium: { px: 14, py: 6, fs: 12, radius: 14 },
    large: { px: 18, py: 8, fs: 13, radius: 16 },
  };

  const vConfig = variantConfig[variant] || variantConfig.primary;
  const sConfig = sizeConfig[size] || sizeConfig.medium;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {/* Glow outer layer */}
      {glowEffect && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sConfig.radius + 8,
              backgroundColor: vConfig.glow,
              opacity: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.25],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
      )}

      <LinearGradient
        colors={vConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badge,
          {
            paddingHorizontal: sConfig.px,
            paddingVertical: sConfig.py,
            borderRadius: sConfig.radius,
          },
        ]}
      >
        {/* Inner rim glow */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sConfig.radius,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          ]}
        />

        {/* Content */}
        <View style={styles.content}>
          {icon && <Text style={[styles.icon, { fontSize: sConfig.fs + 4 }]}>{icon}</Text>}
          <Text style={[styles.label, { fontSize: sConfig.fs, color: '#FFFFFF', fontWeight: '700' }]}>
            {label}
          </Text>
        </View>

        {/* Shine effect */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sConfig.radius,
            },
          ]}
        />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    letterSpacing: 0.3,
  },
});
