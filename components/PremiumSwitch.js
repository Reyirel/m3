/**
 * PremiumSwitch.js
 * Toggle switch ultra-premium con glassmorphism
 * Estilo: Stripe, Apple Design System
 */

import React, { useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumSwitch({
  value = false,
  onValueChange = () => {},
  color = 'primary', // primary | success | warning | danger
  size = 'medium', // small | medium | large
  disabled = false,
}) {
  const { theme, isDark } = useTheme();
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const colorConfig = {
    primary: { gradient: ['#6366F1', '#8B5CF6'], glow: '#6366F1' },
    success: { gradient: ['#10B981', '#059669'], glow: '#10B981' },
    warning: { gradient: ['#F59E0B', '#D97706'], glow: '#F59E0B' },
    danger: { gradient: ['#EF4444', '#DC2626'], glow: '#EF4444' },
  };

  const sizeConfig = {
    small: { width: 44, height: 24, thumbSize: 20, padding: 2 },
    medium: { width: 56, height: 32, thumbSize: 28, padding: 2 },
    large: { width: 68, height: 40, thumbSize: 36, padding: 2 },
  };

  const colorData = colorConfig[color] || colorConfig.primary;
  const sizeData = sizeConfig[size] || sizeConfig.medium;

  const handlePress = () => {
    if (disabled) return;

    const newValue = !value;
    onValueChange(newValue);

    Animated.timing(animValue, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const togglePos = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      sizeData.padding,
      sizeData.width - sizeData.thumbSize - sizeData.padding,
    ],
  });

  const bgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      colorData.glow,
    ],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.5 : 1 }]}
    >
      {/* Background */}
      <Animated.View
        style={[
          styles.background,
          {
            width: sizeData.width,
            height: sizeData.height,
            borderRadius: sizeData.height / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        {/* Rim glow */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sizeData.height / 2,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
          ]}
        />

        {/* Animated thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              width: sizeData.thumbSize,
              height: sizeData.thumbSize,
              borderRadius: sizeData.thumbSize / 2,
              transform: [{ translateX: togglePos }],
            },
          ]}
        >
          <LinearGradient
            colors={value ? colorData.gradient : ['#F3F4F6', '#E5E7EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.thumbGradient,
              {
                borderRadius: sizeData.thumbSize / 2,
              },
            ]}
          >
            {/* Thumb rim */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: sizeData.thumbSize / 2,
                  borderWidth: 1,
                  borderColor: value ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                },
              ]}
            />

            {/* Shine */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: sizeData.thumbSize / 2,
                  opacity: 0.5,
                },
              ]}
            />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumb: {
    position: 'absolute',
    overflow: 'hidden',
  },
  thumbGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
