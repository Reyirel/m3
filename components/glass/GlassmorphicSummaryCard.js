/**
 * GlassmorphicSummaryCard.js
 * Summary/metric card with glassmorphism
 * Displays a metric, value, and optional trend/action
 * 
 * Usage:
 * <GlassmorphicSummaryCard
 *   icon="checkmark-circle"
 *   label="Completed"
 *   value="12"
 *   subtitle="This week"
 *   trend={15} // percentage increase
 *   color="#10b981"
 *   onPress={() => {}}
 * />
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicSummaryCard = ({
  icon,
  label,
  value,
  subtitle,
  trend, // positive or negative number
  color,
  onPress,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const iconColor = color || theme.primary;
  const trendIsPositive = trend ? trend > 0 : null;
  const trendColor = trendIsPositive ? theme.success : trendIsPositive === false ? theme.error : null;

  const content = (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)',
          borderColor: theme.glassBorder,
        },
        style,
      ]}
    >
      {/* Blur effect */}
      {Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 50 : 45}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Background overlay */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
          },
        ]}
      />

      {/* Top highlight stripe */}
      <View
        style={[
          styles.highlight,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
          },
        ]}
      />

      {/* Content Grid */}
      <View style={styles.content}>
        {/* Left: Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconColor + '20',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={28}
            color={iconColor}
          />
        </View>

        {/* Right: Text content */}
        <View style={styles.textContent}>
          {/* Label */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </Text>

          {/* Value */}
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: theme.text }]}>
              {value}
            </Text>
            {trend !== undefined && trend !== null && (
              <View
                style={[
                  styles.trendBadge,
                  { backgroundColor: trendColor + '20' },
                ]}
              >
                <Ionicons
                  name={trendIsPositive ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={trendColor}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trendColor },
                  ]}
                >
                  {Math.abs(trend)}%
                </Text>
              </View>
            )}
          </View>

          {/* Subtitle */}
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Rim glow */}
      <View
        style={[
          styles.rim,
          {
            borderColor: theme.glassBorderSubtle,
          },
        ]}
      />
    </TouchableOpacity>
  );

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
    zIndex: 1,
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicSummaryCard;
