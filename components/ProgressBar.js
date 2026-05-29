// components/ProgressBar.js
// Barra de progreso glassmorphic con rim glow y animación de llenado
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const ProgressBar = memo(function ProgressBar({
  progress = 0,
  size = 'medium',
  showLabel = true,
  color = null,         // null → usa theme.primary por defecto
  label = 'Progreso',
  height = null,
  glassmorphic = true,
  animationDuration = 600,
}) {
  const { theme, isDark } = useTheme();
  const resolvedColor = color || theme.primary;

  const sizeConfig = {
    small:  { height: 4,  labelSize: 12 },
    medium: { height: 8,  labelSize: 14 },
    large:  { height: 12, labelSize: 16 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const barHeight = height || config.height;
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const getColor = (p) => {
    if (p < 33) return theme.error;
    if (p < 66) return theme.warning;
    return resolvedColor;
  };

  const barColor = getColor(clamped);

  // Animated fill width
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clamped,
      duration: animationDuration,
      useNativeDriver: false,
    }).start();
  }, [clamped, animationDuration, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { fontSize: config.labelSize, color: theme.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.percentage, { fontSize: config.labelSize, color: barColor }]}>
            {clamped}%
          </Text>
        </View>
      )}
      <View style={[styles.track, {
        height: barHeight,
        backgroundColor: isDark ? theme.glass : theme.glassStrong,
        borderWidth: 1,
        borderColor: isDark ? theme.glassBorder : theme.glassBorderStrong,
      }]}>
        <Animated.View style={[
          styles.fill,
          {
            height: barHeight,
            width: widthInterpolated,
            backgroundColor: barColor,
            shadowColor: barColor,
            shadowOpacity: isDark ? 0.5 : 0.3,
            shadowRadius: barHeight * 1.5,
            shadowOffset: { width: 0, height: 0 },
          }
        ]} />
        {/* Rim glow */}
        <View style={[StyleSheet.absoluteFill, {
          borderRadius: barHeight / 2,
          borderWidth: 0.5,
          borderColor: isDark ? theme.glassBorder : theme.glassBorderStrong,
          pointerEvents: 'none',
        }]} />
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';
export default ProgressBar;

const styles = StyleSheet.create({
  container: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontWeight: '600' },
  percentage: { fontWeight: '700' },
  track: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { borderRadius: 999 },
});
