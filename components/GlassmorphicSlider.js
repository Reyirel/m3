/**
 * GlassmorphicSlider.js
 * Glassmorphic slider/range input component with custom track styling
 * 
 * Usage:
 * <GlassmorphicSlider
 *   value={50}
 *   onValueChange={setValue}
 *   min={0}
 *   max={100}
 *   label="Volume"
 *   showValue={true}
 * />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicSlider = ({
  value = 50,
  onValueChange,
  min = 0,
  max = 100,
  label,
  icon,
  showValue = true,
  disabled = false,
  step = 1,
  color,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const sliderColor = color || theme.primary;
  const range = max - min;
  const percentage = ((value - min) / range) * 100;

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {(label || icon || showValue) && (
        <View style={styles.labelContainer}>
          <View style={styles.labelContent}>
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
          {showValue && (
            <Text style={[styles.valueText, { color: sliderColor }]}>
              {value}
            </Text>
          )}
        </View>
      )}

      {/* Slider Track */}
      <View
        style={[
          styles.trackContainer,
          {
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.3)'
              : 'rgba(255,255,255,0.4)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.6)',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <BlurView intensity={70} style={styles.blurContainer}>
          {/* Progress track */}
          <View
            style={[
              styles.progressTrack,
              {
                width: `${percentage}%`,
                backgroundColor: sliderColor,
              },
            ]}
          >
            {/* Glow effect on progress */}
            <View
              style={[
                styles.progressGlow,
                {
                  backgroundColor: `${sliderColor}40`,
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

        {/* Thumb */}
        <View
          style={[
            styles.thumbContainer,
            {
              left: `${percentage}%`,
              transform: [{ translateX: -12 }],
            },
          ]}
        >
          <View
            style={[
              styles.thumbCircle,
              {
                backgroundColor: sliderColor,
                borderColor: isDark
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(255,255,255,0.5)',
              },
            ]}
          />
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

        {/* Rim glow */}
        <View
          style={[
            styles.rimGlow,
            {
              borderColor: `${sliderColor}40`,
            },
          ]}
        />
      </View>

      {/* Range info */}
      <View style={styles.rangeContainer}>
        <Text style={[styles.rangeText, { color: theme.textSecondary }]}>
          {min}
        </Text>
        <Text style={[styles.rangeText, { color: theme.textSecondary }]}>
          {max}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContent: {
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
  valueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  trackContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'center',
  },
  blurContainer: {
    flex: 1,
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    borderRadius: 12,
  },
  progressGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  highlightStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  thumbContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  thumbCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbShine: {
    position: 'absolute',
    width: 24,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    top: 0,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default GlassmorphicSlider;
