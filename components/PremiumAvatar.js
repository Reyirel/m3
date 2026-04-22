/**
 * PremiumAvatar.js
 * Avatar ultra-premium con glow, badge, y efectos animados
 * Estilo: Usado en apps de lujo tipo Figma, Notion, Linear
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumAvatar({
  size = 'medium', // small | medium | large | xlarge
  source = null, // Image source
  initials = 'JD', // Fallback text
  color = 'primary', // primary | secondary | success | warning | danger
  status = null, // online | offline | away | null
  glowEffect = true,
  badge = null, // Badge text/icon
  animated = true,
  style,
}) {
  const { theme, isDark } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (glowEffect && animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [glowEffect, animated]);

  // Pulse for status indicator
  useEffect(() => {
    if (status === 'online') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status]);

  const sizeConfig = {
    small: { size: 32, fontSize: 11, badgeSize: 10, statusSize: 6 },
    medium: { size: 48, fontSize: 14, badgeSize: 14, statusSize: 8 },
    large: { size: 64, fontSize: 16, badgeSize: 18, statusSize: 10 },
    xlarge: { size: 80, fontSize: 20, badgeSize: 24, statusSize: 12 },
  };

  const colorConfig = {
    primary: { gradient: ['#6366F1', '#8B5CF6'], glow: '#6366F1' },
    secondary: { gradient: ['#EC4899', '#F43F5E'], glow: '#EC4899' },
    success: { gradient: ['#10B981', '#059669'], glow: '#10B981' },
    warning: { gradient: ['#F59E0B', '#D97706'], glow: '#F59E0B' },
    danger: { gradient: ['#EF4444', '#DC2626'], glow: '#EF4444' },
  };

  const statusColorConfig = {
    online: '#10B981',
    offline: '#6B7280',
    away: '#F59E0B',
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const colors = colorConfig[color] || colorConfig.primary;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: config.size,
          height: config.size,
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      {/* Glow outer */}
      {glowEffect && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: config.size / 2,
              backgroundColor: colors.glow,
              opacity: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.25],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
      )}

      {/* Main avatar circle */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.avatar,
          {
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
            shadowColor: colors.glow,
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          },
        ]}
      >
        {/* Rim glow */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: config.size / 2,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          ]}
        />

        {/* Image or initials */}
        {source ? (
          <Image
            source={source}
            style={{
              width: config.size - 4,
              height: config.size - 4,
              borderRadius: (config.size - 4) / 2,
            }}
          />
        ) : (
          <Text
            style={{
              fontSize: config.fontSize,
              fontWeight: '700',
              color: '#FFFFFF',
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </Text>
        )}

        {/* Shine effect */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: config.size / 2,
            },
          ]}
        />
      </LinearGradient>

      {/* Status indicator */}
      {status && (
        <View
          style={[
            {
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: config.statusSize + 6,
              height: config.statusSize + 6,
              borderRadius: (config.statusSize + 6) / 2,
              backgroundColor: statusColorConfig[status],
              borderWidth: 3,
              borderColor: isDark ? '#1F2937' : '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            },
          ]}
        >
          {status === 'online' && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: (config.statusSize + 6) / 2,
                  backgroundColor: statusColorConfig[status],
                  opacity: 0.5,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: [0.8, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>
      )}

      {/* Badge */}
      {badge && (
        <View
          style={[
            {
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: config.badgeSize + 8,
              height: config.badgeSize + 8,
              borderRadius: (config.badgeSize + 8) / 2,
              backgroundColor: '#EF4444',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: isDark ? '#1F2937' : '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
        >
          <Text
            style={{
              fontSize: Math.max(9, config.fontSize - 4),
              fontWeight: '700',
              color: '#FFFFFF',
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
