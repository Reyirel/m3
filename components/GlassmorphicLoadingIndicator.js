/**
 * GlassmorphicLoadingIndicator.js
 * Glassmorphic loading spinner with multiple styles
 * 
 * Usage:
 * <GlassmorphicLoadingIndicator
 *   size="large" // 'small', 'medium', 'large'
 *   message="Loading..."
 *   fullScreen={false}
 *   variant="spinner" // 'spinner', 'dots', 'pulse'
 * />
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicLoadingIndicator = ({
  size = 'medium', // 'small' | 'medium' | 'large'
  message,
  fullScreen = false,
  variant = 'spinner', // 'spinner' | 'dots' | 'pulse'
  color,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const sizeConfig = {
    small: { container: 60, icon: 24, fontSize: 12 },
    medium: { container: 80, icon: 32, fontSize: 13 },
    large: { container: 120, icon: 48, fontSize: 14 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const indicatorColor = color || theme.primary;

  // Spinner animation
  useEffect(() => {
    if (variant === 'spinner') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [spinAnim, variant]);

  // Pulse animation
  useEffect(() => {
    if (variant === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulseAnim, variant]);

  const loadingIndicator = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Animated.View
            style={[
              styles.iconContainer,
              {
                width: config.container,
                height: config.container,
                transform: [
                  {
                    rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.spinner,
                {
                  width: config.container,
                  height: config.container,
                  borderColor: indicatorColor + '30',
                  borderTopColor: indicatorColor,
                },
              ]}
            />
          </Animated.View>
        );

      case 'dots':
        return (
          <View style={[styles.iconContainer, { width: config.container, height: config.container }]}>
            <View style={styles.dotsContainer}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: config.icon / 3,
                      height: config.icon / 3,
                      backgroundColor: indicatorColor,
                      opacity: 0.3 + (i / 3) * 0.7,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        );

      case 'pulse':
      default:
        return (
          <Animated.View
            style={[
              styles.iconContainer,
              {
                width: config.container,
                height: config.container,
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ]}
          >
            <View
              style={[
                styles.pulseCircle,
                {
                  width: config.icon,
                  height: config.icon,
                  borderRadius: config.icon / 2,
                  borderColor: indicatorColor,
                },
              ]}
            />
          </Animated.View>
        );
    }
  };

  const content = (
    <View
      style={[
        styles.content,
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

      {/* Loading indicator */}
      {loadingIndicator()}

      {/* Message */}
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: theme.text,
              fontSize: config.fontSize,
            },
          ]}
        >
          {message}
        </Text>
      )}

      {/* Rim glow */}
      <View
        style={[
          styles.rim,
          {
            borderColor: theme.glassBorderSubtle,
          },
        ]}
      />
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        {/* Backdrop */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDark
                ? 'rgba(0,0,0,0.4)'
                : 'rgba(255,255,255,0.6)',
            },
          ]}
        />

        {/* Content */}
        <View style={styles.fullScreenCentered}>
          {content}
        </View>
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenCentered: {
    minWidth: 140,
    minHeight: 140,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 999,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    borderRadius: 999,
  },
  pulseCircle: {
    borderWidth: 2,
  },
  message: {
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    zIndex: 2,
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

export default GlassmorphicLoadingIndicator;
