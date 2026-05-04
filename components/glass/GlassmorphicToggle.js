/**
 * GlassmorphicToggle.js
 * Glassmorphic toggle/switch component with animated transitions
 * 
 * Usage:
 * <GlassmorphicToggle
 *   value={isEnabled}
 *   onValueChange={setIsEnabled}
 *   label="Dark Mode"
 *   icon="moon"
 * />
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicToggle = ({
  value = false,
  onValueChange,
  label,
  icon,
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const sizeConfig = {
    small: { width: 40, height: 24, trackPadding: 2, iconSize: 12 },
    medium: { width: 54, height: 32, trackPadding: 3, iconSize: 14 },
    large: { width: 68, height: 40, trackPadding: 4, iconSize: 16 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const thumbSize = config.width / 2 - config.trackPadding;
  const thumbOffset = value ? config.width - thumbSize - config.trackPadding : config.trackPadding;

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label + Icon */}
      {(label || icon) && (
        <View style={styles.labelContainer}>
          {icon && (
            <Ionicons
              name={icon}
              size={16}
              color={theme.textSecondary}
              style={styles.icon}
            />
          )}
          {label && (
            <Text style={[styles.labelText, { color: theme.text }]}>
              {label}
            </Text>
          )}
        </View>
      )}

      {/* Toggle Track */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.track,
          {
            width: config.width,
            height: config.height,
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.4)'
              : 'rgba(255,255,255,0.5)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.6)',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <BlurView intensity={value ? 80 : 60} style={[styles.blurContainer, { height: config.height }]}>
          {/* Thumb */}
          <View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                left: thumbOffset,
                backgroundColor: value ? theme.primary : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'),
              },
            ]}
          >
            {/* Thumb shine */}
            <View
              style={[
                styles.thumbShine,
                {
                  backgroundColor: 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          </View>

          {/* Highlight stripe */}
          <View
            style={[
              styles.highlightStripe,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.6)',
              },
            ]}
          />
        </BlurView>

        {/* Rim glow */}
        <View
          style={[
            styles.rimGlow,
            {
              borderColor: value
                ? `${theme.primary}40`
                : isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.3)',
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  track: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blurContainer: {
    flex: 1,
    position: 'relative',
  },
  thumb: {
    borderRadius: 999,
    position: 'absolute',
    top: '50%',
    marginTop: 0,
    transform: [{ translateY: -12 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 2,
  },
  thumbShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderRadius: 999,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  highlightStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicToggle;
