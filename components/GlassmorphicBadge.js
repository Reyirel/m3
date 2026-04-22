/**
 * GlassmorphicBadge.js
 * Glassmorphic badge component for displaying labels, counts, status
 * 
 * Usage:
 * <GlassmorphicBadge label="5" color="#FF6B6B" />
 * <GlassmorphicBadge label="New" variant="primary" />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicBadge = ({
  label,
  variant = 'primary', // 'primary', 'success', 'error', 'warning', 'info'
  color,
  size = 'medium', // 'small', 'medium', 'large'
  style,
}) => {
  const { theme, isDark } = useTheme();

  const variantConfig = {
    primary: { bg: theme.primary, text: '#FFFFFF' },
    success: { bg: theme.success, text: '#FFFFFF' },
    error: { bg: theme.error, text: '#FFFFFF' },
    warning: { bg: theme.warning, text: '#FFFFFF' },
    info: { bg: theme.info, text: '#FFFFFF' },
  };

  const sizeConfig = {
    small: { padding: [4, 8], fontSize: 10, fontWeight: '600' },
    medium: { padding: [6, 10], fontSize: 12, fontWeight: '600' },
    large: { padding: [8, 12], fontSize: 14, fontWeight: '700' },
  };

  const config = variantConfig[variant] || variantConfig.primary;
  const sizeStyle = sizeConfig[size] || sizeConfig.medium;

  const bgColor = color || config.bg;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor + '30',
          borderColor: bgColor,
          paddingHorizontal: sizeStyle.padding[1],
          paddingVertical: sizeStyle.padding[0],
        },
        style,
      ]}
    >
      {/* Blur effect */}
      {Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 40 : 35}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Content */}
      <Text
        style={[
          styles.label,
          {
            color: bgColor,
            fontSize: sizeStyle.fontSize,
            fontWeight: sizeStyle.fontWeight,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.1,
    zIndex: 2,
  },
});

export default GlassmorphicBadge;
