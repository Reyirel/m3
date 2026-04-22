/**
 * GlowEffect.js
 * Envoltorio de glow para cualquier componente
 * Añade aura luminosa customizable
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function GlowEffect({
  children,
  color = '#6366F1', // Glow color
  size = 'medium', // small | medium | large
  intensity = 0.8, // 0-1
  animated = true,
  animationDuration = 2000,
  style,
}) {
  const { theme, isDark } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: animationDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: animationDuration / 2,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated, animationDuration]);

  const sizeConfig = {
    small: { blur: 8, spread: 2 },
    medium: { blur: 16, spread: 4 },
    large: { blur: 24, spread: 8 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [intensity * 0.3, intensity],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: 1,
        },
        style,
      ]}
    >
      {/* Outer glow layer 1 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderRadius: 999,
            opacity: glowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.15],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
            marginHorizontal: -config.spread * 2,
            marginVertical: -config.spread * 2,
          },
        ]}
      />

      {/* Outer glow layer 2 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderRadius: 999,
            opacity: glowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.05, 0.08],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.2, 1.4],
                }),
              },
            ],
            marginHorizontal: -config.spread * 4,
            marginVertical: -config.spread * 4,
          },
        ]}
      />

      {/* Inner glow (small) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderRadius: 999,
            opacity: glowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.3],
            }),
            marginHorizontal: -config.spread / 2,
            marginVertical: -config.spread / 2,
          },
        ]}
      />

      {/* Content */}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({});
