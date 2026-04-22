/**
 * PremiumFloatingButton.js
 * FAB ultra-premium con glow, badge, y animaciones spring
 */

import React, { useRef, useEffect } from 'react';
import { Pressable, StyleSheet, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumFloatingButton({
  onPress = () => {},
  icon = 'add',
  label = null,
  badge = null,
  color = 'primary', // primary | secondary | success | danger
  size = 'large', // medium | large | xlarge
  showGlow = true,
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated && showGlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [animated, showGlow]);

  const colorConfig = {
    primary: { gradient: ['#6366F1', '#8B5CF6'], glow: '#6366F1' },
    secondary: { gradient: ['#EC4899', '#F43F5E'], glow: '#EC4899' },
    success: { gradient: ['#10B981', '#059669'], glow: '#10B981' },
    danger: { gradient: ['#EF4444', '#DC2626'], glow: '#EF4444' },
  };

  const sizeConfig = {
    medium: { size: 52, iconSize: 24 },
    large: { size: 64, iconSize: 28 },
    xlarge: { size: 76, iconSize: 32 },
  };

  const colorData = colorConfig[color] || colorConfig.primary;
  const sizeData = sizeConfig[size] || sizeConfig.large;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[styles.container, { width: sizeData.size + 20, height: sizeData.size + 20 }]}>
      {/* Glow layers */}
      {showGlow && (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: (sizeData.size + 20) / 2,
                backgroundColor: colorData.glow,
                opacity: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.35],
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
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: (sizeData.size + 20) / 2,
                backgroundColor: colorData.glow,
                opacity: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.18],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.3, 1.6],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.button,
          {
            width: sizeData.size,
            height: sizeData.size,
            borderRadius: sizeData.size / 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.pressable]}>
          <LinearGradient
            colors={colorData.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              {
                borderRadius: sizeData.size / 2,
              },
            ]}
          >
            {/* Rim glow */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: sizeData.size / 2,
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              ]}
            />

            {/* Icon */}
            <Ionicons
              name={icon}
              size={sizeData.iconSize}
              color="#FFFFFF"
              style={styles.icon}
            />

            {/* Shine effect */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: sizeData.size / 2,
                },
              ]}
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Badge */}
      {badge && (
        <View
          style={[
            styles.badge,
            {
              width: Math.max(22, badge.toString().length * 10),
              height: 22,
              borderRadius: 11,
              right: -4,
              top: -4,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.badgeText,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {badge}
          </Animated.Text>
        </View>
      )}

      {/* Label (optional) */}
      {label && <View style={styles.label} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  icon: {
    zIndex: 2,
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  label: {
    marginTop: 8,
  },
});
