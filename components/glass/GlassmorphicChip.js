/**
 * GlassmorphicChip.js
 * Glassmorphic chip component for tags, filters, selections
 * 
 * Usage:
 * <GlassmorphicChip
 *   icon="checkmark"
 *   label="Selected"
 *   onPress={() => {}}
 *   selected={true}
 * />
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicChip = ({
  label,
  icon,
  onPress,
  selected = false,
  color,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const chipColor = color || theme.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? chipColor
            : isDark
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(0,0,0,0.05)',
          borderColor: selected
            ? chipColor
            : isDark
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.12)',
        },
        style,
      ]}
    >
      {/* Blur effect */}
      {Platform.OS !== 'web' && !selected && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 50 : 45}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={selected ? '#FFFFFF' : chipColor}
          />
        )}
        <Text
          style={[
            styles.label,
            {
              color: selected ? '#FFFFFF' : theme.text,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Rim glow */}
      <View
        style={[
          styles.rim,
          {
            borderColor: selected
              ? chipColor
              : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicChip;
