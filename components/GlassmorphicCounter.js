/**
 * GlassmorphicCounter.js
 * Glassmorphic counter/stepper component with increment/decrement controls
 * 
 * Usage:
 * <GlassmorphicCounter
 *   value={count}
 *   onValueChange={setCount}
 *   min={0}
 *   max={100}
 *   step={1}
 *   label="Quantity"
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
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicCounter = ({
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  icon,
  disabled = false,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const handleDecrement = () => {
    if (!disabled) {
      const newValue = Math.max(min, value - step);
      onValueChange?.(newValue);
    }
  };

  const handleIncrement = () => {
    if (!disabled) {
      const newValue = Math.min(max, value + step);
      onValueChange?.(newValue);
    }
  };

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
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

      {/* Counter */}
      <View
        style={[
          styles.counterContainer,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)',
            borderColor: theme.glassBorder,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <BlurView intensity={70} style={styles.blurContent}>
          {/* Decrement Button */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleDecrement}
            disabled={disabled || isAtMin}
            style={[
              styles.button,
              {
                backgroundColor: isAtMin
                  ? isDark
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(255,255,255,0.2)'
                  : isDark
                    ? 'rgba(200,100,255,0.2)'
                    : 'rgba(200,100,255,0.3)',
              },
            ]}
          >
            <Ionicons
              name="remove"
              size={16}
              color={isAtMin ? theme.textSecondary : theme.primary}
            />
          </TouchableOpacity>

          {/* Value Display */}
          <View style={styles.valueContainer}>
            <Text
              style={[
                styles.valueText,
                { color: theme.text, fontSize: 16, fontWeight: '600' },
              ]}
            >
              {value}
            </Text>
          </View>

          {/* Increment Button */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleIncrement}
            disabled={disabled || isAtMax}
            style={[
              styles.button,
              {
                backgroundColor: isAtMax
                  ? isDark
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(255,255,255,0.2)'
                  : isDark
                    ? 'rgba(16,185,129,0.2)'
                    : 'rgba(16,185,129,0.3)',
              },
            ]}
          >
            <Ionicons
              name="add"
              size={16}
              color={isAtMax ? theme.textSecondary : '#10b981'}
            />
          </TouchableOpacity>
        </BlurView>

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

        {/* Rim glow */}
        <View
          style={[
            styles.rimGlow,
            {
              borderColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.3)',
            },
          ]}
        />
      </View>

      {/* Range info */}
      <Text style={[styles.rangeText, { color: theme.textSecondary }]}>
        {min} - {max}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
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
  counterContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blurContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minHeight: 36,
  },
  valueText: {
    fontVariant: ['tabular-nums'],
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
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default GlassmorphicCounter;
