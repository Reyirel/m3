// components/StatCard.js
// Tarjeta de estadística con diseño glassmorphism premium con rim glow
import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassView } from '../utils/GlassView';


const StatCard = memo(function StatCard({
  icon = 'checkmark-circle',
  iconColor,
  label = 'Completadas',
  value = '0',
  subtitle = '',
  trend = null,  // { direction: 'up' | 'down', value: '5%' }
  variant = 'default',
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const VARIANT_COLORS = {
    success: { base: theme.success, light: theme.successAlpha, dark: theme.successAlpha },
    warning: { base: theme.warning, light: theme.warningAlpha, dark: theme.warningAlpha },
    error:   { base: theme.error,   light: theme.errorAlpha,   dark: theme.errorAlpha   },
    info:    { base: theme.info,    light: theme.infoAlpha,    dark: theme.infoAlpha    },
  };

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [animated, scaleAnim, opacityAnim]);

  const vc = VARIANT_COLORS[variant];
  const accentColor = vc ? vc.base : theme.primary;
  const iconBg = vc
    ? vc.light
    : theme.primaryAlpha;
  const resolvedIconColor = iconColor || accentColor;

  const glassBg = isDark ? theme.glass : theme.glassStrong;
  const glassBorder = isDark ? theme.glassBorder : theme.glassBorderSubtle;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Outer glass container with deep blur effect */}
      <View style={styles.glassOuter}>
        <BlurView intensity={isDark ? 50 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </View>
      
      <GlassView
        intensity={isDark ? 55 : 70}
        tint={isDark ? 'dark' : 'light'}
        noBlur
        style={[styles.container, { backgroundColor: glassBg, borderColor: glassBorder, shadowColor: theme.glassShadow }]}
      >
        <LinearGradient
          colors={[accentColor, accentColor + '00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentStrip}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Icon + Trend row */}
          <View style={styles.topRow}>
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={22} color={resolvedIconColor} />
            </View>
            {trend && (
              <View style={[
                styles.trend,
                {
                  backgroundColor: trend.direction === 'up'
                    ? theme.successAlpha
                    : theme.errorAlpha,
                },
              ]}>
                <Ionicons
                  name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={trend.direction === 'up' ? theme.success : theme.error}
                />
                <Text style={[
                  styles.trendText,
                  { color: trend.direction === 'up' ? theme.success : theme.error },
                ]}>
                  {trend.value}
                </Text>
              </View>
            )}
          </View>

          {/* Value */}
          <Text style={[styles.value, { color: theme.text }]}>
            {value}
          </Text>

          {/* Label */}
          <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>

          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Inner Rim Glow */}
        <View style={[styles.rimGlow, {
          borderColor: isDark ? theme.glassBorder : theme.glassBorderStrong,
          borderWidth: 1.5,
        }]} />

        {/* Bottom accent border */}
        <View style={[styles.bottomBorder, { backgroundColor: accentColor + '40' }]} />
      </GlassView>
    </Animated.View>
  );
});

StatCard.displayName = 'StatCard';
export default StatCard;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  glassOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  container: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 118,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    opacity: 0.80,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '400',
    opacity: 0.65,
  },
  rimGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    pointerEvents: 'none',
  },
  bottomBorder: {
    height: 2,
    marginHorizontal: 14,
    borderRadius: 1,
    marginBottom: 10,
  },
});
