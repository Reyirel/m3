/**
 * PremiumSheet.js
 * Bottom sheet ultra-premium con glassmorphism y smooth animations
 * Estilo: Stripe, Apple Maps, Premium apps
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumSheet({
  visible = false,
  onClose = () => {},
  children,
  snapPoints = [100, 300, '90%'], // Adjustable heights
  backgroundColor = 'dark',
  showHandle = true,
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && animated) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && animated) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, animated, height]);

  const bgColors = {
    dark: ['rgba(30, 41, 59, 0.88)', 'rgba(15, 23, 42, 0.92)'],
    light: ['rgba(255, 255, 255, 0.92)', 'rgba(248, 249, 250, 0.95)'],
    primary: ['rgba(99, 102, 241, 0.85)', 'rgba(88, 80, 235, 0.88)'],
  };

  const colors = bgColors[backgroundColor] || bgColors.dark;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        active={false}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={isDark ? 50 : 70} tint={isDark ? 'dark' : 'light'}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.container}>
              {/* Handle */}
              {showHandle && (
                <View style={styles.handleContainer}>
                  <View
                    style={[
                      styles.handle,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                      },
                    ]}
                  />
                </View>
              )}

              {/* Rim glow */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 24,
                  },
                ]}
              />

              {/* Content */}
              <View style={styles.content}>{children}</View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  container: {
    flex: 1,
    paddingTop: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
