// components/MetricCard.js
// Tarjeta de métrica pequeña para mostrar en resumen rápido - CON RIM GLOW GLASSMORPHIC
// ✨ Metricas rápidas del desempeño
// ⚡ Optimizado con React.memo

import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassView } from '../utils/GlassView';

const MetricCard = memo(function MetricCard({
  icon = 'checkmark-circle',
  iconColor = null,
  label = 'Completadas',
  value = '0',
  subtitle = '',
  borderColor = null,
  trend = null,  // { direction: 'up' | 'down', value: '5%', label: 'vs semana pasada' }
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const resolvedIconColor = iconColor ?? theme.success;
  const resolvedBorderColor = borderColor ?? theme.success;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated, scaleAnim]);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      {/* Blur layer for glassmorphism — native only */}
      {Platform.OS !== 'web' && (
        <View style={styles.blurContainer}>
          <BlurView intensity={isDark ? 45 : 55} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </View>
      )}

      <GlassView
        intensity={isDark ? 50 : 65}
        tint={isDark ? 'dark' : 'light'}
        noBlur
        style={[
          styles.container,
          {
            backgroundColor: isDark ? theme.glass : theme.glassStrong,
            borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle,
            borderLeftColor: resolvedBorderColor,
            shadowColor: theme.glassShadow,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${resolvedBorderColor}15` }]}>
            <Ionicons name={icon} size={20} color={resolvedIconColor} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: resolvedBorderColor }]}>
              {value}
            </Text>
            {trend && (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: trend.direction === 'up' ? theme.successAlpha : theme.errorAlpha,
                  },
                ]}
              >
                <Ionicons
                  name={trend.direction === 'up' ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={trend.direction === 'up' ? theme.success : theme.error}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trend.direction === 'up' ? theme.success : theme.error },
                  ]}
                >
                  {trend.value}
                </Text>
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              {subtitle}
            </Text>
          )}
          {trend?.label && (
            <Text style={[styles.trendLabel, { color: theme.textTertiary }]}>
              {trend.label}
            </Text>
          )}
        </View>

        {/* Inner Rim Glow */}
        <View style={[styles.rimGlow, {
          borderColor: isDark ? theme.glassBorder : theme.glassBorderStrong,
          borderWidth: 1,
        }]} />
      </GlassView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    minWidth: 140,
    flex: 1,
    maxWidth: 200,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  container: {
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trendLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '400',
  },
  rimGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    pointerEvents: 'none',
  },
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;
