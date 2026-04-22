/**
 * AnimatedTabIndicator.js
 * Indicador de tabs animado con glasmorfismo, rim glow y spring animations
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

export default function AnimatedTabIndicator({
  position,
  tabWidth,
  color = '#3B82F6',
  height = 4,
  style,
  glassEffect = true,
}) {
  const { theme, isDark } = useTheme();
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(position.value * tabWidth, {
            damping: 20,
            mass: 1,
            overshootClamping: false,
          }),
        },
      ],
      width: tabWidth,
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height,
        },
        animatedStyle,
        style,
      ]}
    >
      {glassEffect && (
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </View>
      )}

      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />

      {/* Rim Glow */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: height / 2,
            borderWidth: 0.5,
            borderColor: theme.glassBorderSubtle,
            pointerEvents: 'none',
          },
        ]}
      />

      {/* Shadow effect */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            borderRadius: height / 2,
            opacity: 0.2,
            shadowColor: color,
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
