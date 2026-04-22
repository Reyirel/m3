/**
 * PremiumGradientText.js
 * Texto con gradientes animados - Estilo premium Apple/Tesla
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumGradientText({
  text = 'Premium Text',
  colors = ['#6366F1', '#8B5CF6', '#EC4899'],
  size = 'large', // small | medium | large | xlarge
  weight = '700', // 400 | 600 | 700 | 800
  animated = true,
  animationDuration = 3000,
  angle = 45, // Gradient angle in degrees
  style,
}) {
  const { theme, isDark } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [animated, animationDuration]);

  const sizeConfig = {
    small: 12,
    medium: 16,
    large: 24,
    xlarge: 32,
  };

  const fontSize = sizeConfig[size] || sizeConfig.large;
  const angleRad = (angle * Math.PI) / 180;
  const start = {
    x: Math.sin(angleRad),
    y: Math.cos(angleRad),
  };
  const end = {
    x: Math.sin(angleRad + Math.PI),
    y: Math.cos(angleRad + Math.PI),
  };

  // Calculate animated colors
  const getAnimatedColors = () => {
    if (!animated) return colors;

    return colors.map((color, index) => {
      // Rotate through colors for animated effect
      const rotation = (index / colors.length) * Math.PI * 2;
      return color;
    });
  };

  return (
    <View style={[{ overflow: 'hidden', borderRadius: 8 }, style]}>
      <LinearGradient
        colors={getAnimatedColors()}
        start={start}
        end={end}
        style={styles.container}
      >
        <Text
          style={{
            fontSize,
            fontWeight: weight,
            color: '#FFFFFF',
            letterSpacing: 0.3,
            textShadowColor: 'rgba(0, 0, 0, 0.2)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}
        >
          {text}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
