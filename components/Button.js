// components/Button.js
// Botón moderno con variantes, gradiente y glasmorfismo
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | ghost | danger | glass
  size = 'medium',      // small | medium | large
  icon = null,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.965,
        friction: 8,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const sizeMap = {
    small:  { py: 10, px: 18, fs: 14, icon: 16, minH: 44, radius: 12 },
    medium: { py: 14, px: 24, fs: 15, icon: 19, minH: 50, radius: 14 },
    large:  { py: 17, px: 30, fs: 17, icon: 21, minH: 56, radius: 16 },
  };
  const sz = sizeMap[size] || sizeMap.medium;
  const isDisabled = disabled || loading;

  const variantConfig = {
    primary: {
      gradientColors: [theme.primary, theme.primaryDark],
      textColor: '#FFFFFF',
      shadowColor: theme.primary,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    secondary: {
      gradientColors: isDark
        ? [theme.surfaceL2, theme.surfaceL2]
        : [theme.surfaceL2, theme.surfaceL2],
      textColor: theme.primary,
      shadowColor: 'transparent',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.08)',
    },
    ghost: {
      gradientColors: ['transparent', 'transparent'],
      textColor: theme.primary,
      shadowColor: 'transparent',
      borderWidth: 1.5,
      borderColor: isDark ? theme.primary + '66' : theme.primary + '44',
    },
    danger: {
      gradientColors: [theme.error, theme.errorDark],
      textColor: '#FFFFFF',
      shadowColor: theme.error,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    glass: {
      gradientColors: isDark
        ? [theme.glass, theme.glass]
        : [theme.glassStrong, theme.glassStrong],
      textColor: isDark ? '#FFFFFF' : theme.primary,
      shadowColor: '#000',
      borderWidth: 1,
      borderColor: theme.glassBorder,
      blurIntensity: isDark ? 50 : 70,
      useBlur: true,
    },
  };

  const cfg = variantConfig[variant] || variantConfig.primary;

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.28],
  });
  const shadowElevation = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 5],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          ...(Platform.OS !== 'web' ? { shadowOpacity, elevation: shadowElevation } : {}),
        },
        fullWidth && { width: '100%' },
      ]}
    >
      {/* Glass Blur Layer */}
      {cfg.useBlur && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: sz.radius, overflow: 'hidden' }]}>
          <BlurView intensity={cfg.blurIntensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </View>
      )}
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.88}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        style={[
          styles.touchable,
          {
            borderRadius: sz.radius,
            borderWidth: cfg.borderWidth,
            borderColor: cfg.borderColor,
            shadowColor: cfg.shadowColor,
          },
          isDisabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        <LinearGradient
          colors={cfg.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={[
            styles.inner,
            {
              paddingVertical: sz.py,
              paddingHorizontal: sz.px,
              minHeight: sz.minH,
              borderRadius: sz.radius,
            },
          ]}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color={cfg.textColor} />
              <Text style={[styles.text, { color: cfg.textColor, fontSize: sz.fs, marginLeft: 8 }]}>
                Cargando...
              </Text>
            </>
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <Ionicons name={icon} size={sz.icon} color={cfg.textColor} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.text, { color: cfg.textColor, fontSize: sz.fs }]}>
                {title}
              </Text>
              {icon && iconPosition === 'right' && (
                <Ionicons name={icon} size={sz.icon} color={cfg.textColor} style={{ marginLeft: 8 }} />
              )}
            </>
          )}
        </LinearGradient>
        {/* Rim Glow para glass */}
        {cfg.useBlur && (
          <View style={[StyleSheet.absoluteFill, {
            borderRadius: sz.radius,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : theme.glassBorderSubtle,
            pointerEvents: 'none',
          }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.42,
  },
});
