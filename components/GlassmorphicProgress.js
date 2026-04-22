/**
 * GlassmorphicProgress.js
 * Glassmorphic progress bar component
 * 
 * Usage:
 * <GlassmorphicProgress value={65} label="65%" color="#10b981" />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicProgress = ({
  value = 0, // 0-100
  label,
  color,
  showLabel = true,
  size = 'medium', // 'small', 'medium', 'large'
  style,
}) => {
  const { theme, isDark } = useTheme();
  const progressColor = color || theme.primary;

  const sizeConfig = {
    small: { height: 4, fontSize: 10 },
    medium: { height: 6, fontSize: 12 },
    large: { height: 8, fontSize: 14 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.labelText, { color: theme.textSecondary, fontSize: config.fontSize }]}>
              {label}
            </Text>
          )}
          <Text style={[styles.valueText, { color: progressColor, fontSize: config.fontSize }]}>
            {clampedValue.toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Progress bar */}
      <View
        style={[
          styles.barContainer,
          {
            height: config.height,
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)',
            borderColor: theme.glassBorder,
          },
        ]}
      >
        {/* Progress fill */}
        <View
          style={[
            styles.barFill,
            {
              width: `${clampedValue}%`,
              backgroundColor: progressColor,
              height: config.height,
            },
          ]}
        />

        {/* Highlight effect */}
        <View
          style={[
            styles.barHighlight,
            {
              height: config.height / 2,
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontWeight: '500',
  },
  valueText: {
    fontWeight: '700',
  },
  barContainer: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  barFill: {
    borderRadius: 999,
  },
  barHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
});

export default GlassmorphicProgress;
