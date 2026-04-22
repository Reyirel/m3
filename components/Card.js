// components/Card.js
// Card moderno con glassmorphism y animaciones
import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { GlassView } from '../utils/GlassView';
import { BlurView } from 'expo-blur';

export default function Card({
  children,
  variant = 'elevated', // elevated, flat, glass, outlined
  onPress = null,
  style,
  padding = 16,
  animated = true,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current; // web hover lift

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  // Web hover handlers — subtle lift like Apple/Windows cards
  const handleMouseEnter = Platform.OS === 'web' && onPress ? () => {
    Animated.timing(hoverAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  } : undefined;
  const handleMouseLeave = Platform.OS === 'web' && onPress ? () => {
    Animated.timing(hoverAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  } : undefined;

  const hoverTranslateY = useMemo(
    () => hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
    [hoverAnim]
  );

  const getVariantStyles = () => {
    // Web glass: backdropFilter en el outer view
    // Light mode: saturate menor para no blanquear el fondo
    const webGlassFilter = Platform.OS === 'web' ? {
      backdropFilter: `blur(${isDark ? 20 : 16}px) saturate(${isDark ? 180 : 140}%)`,
      WebkitBackdropFilter: `blur(${isDark ? 20 : 16}px) saturate(${isDark ? 180 : 140}%)`,
    } : {};

    switch (variant) {
      case 'flat':
        return { backgroundColor: theme.surface, elevation: 0, shadowOpacity: 0 };
      case 'glass':
        return {
          backgroundColor: isDark ? theme.glass : theme.glassStrong,
          borderWidth: 1,
          borderColor: isDark ? theme.glassBorder : theme.glassBorder,
          elevation: isDark ? 0 : 4,
          shadowColor: theme.glassShadow,
          shadowOffset: { width: 0, height: isDark ? 0 : 3 },
          shadowOpacity: isDark ? 0 : 0.14,
          shadowRadius: isDark ? 0 : 10,
          ...webGlassFilter,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: isDark ? theme.glassBorder : theme.border,
          elevation: 0,
          shadowOpacity: 0,
        };
      default: // elevated — solid surface, Apple-style shadow
        return {
          backgroundColor: isDark ? theme.card : theme.card,
          borderWidth: 0.5,
          borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)',
          elevation: isDark ? 4 : 3,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: isDark ? 6 : 2 },
          shadowOpacity: isDark ? 0.40 : 0.10,
          shadowRadius: isDark ? 14 : 8,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const isGlass = variant === 'glass' || variant === 'elevated';

  const CardContent = () => (
    <View style={[styles.card, variantStyles, { padding }, style]}>
      {/* Blur layer — native only. Web uses backdropFilter on outer view (richer saturate support) */}
      {isGlass && Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFillObject, { borderRadius: 20, overflow: 'hidden' }]}>
          <BlurView
            intensity={isDark ? 40 : 50}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      {/* Top inner highlight — mimics Apple's glass top edge */}
      {isGlass && (
        <View
          pointerEvents="none"
          style={[
            styles.cardHighlight,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.90)' },
          ]}
        />
      )}
      {children}
      {/* Directional rim: dark mode → blanco; light mode → gris sutil */}
      {isGlass && (
        <View
          pointerEvents="none"
          style={[
            styles.cardRim,
            { borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    // En web: dos Animated.Views separados para evitar mezclar drivers en el mismo transform.
    // hoverTranslateY (JS driver) va en el View exterior; scaleAnim (native driver) va en el interior.
    // En nativo: solo scaleAnim — hover no aplica.
    if (Platform.OS === 'web') {
      return (
        <Animated.View
          style={{ transform: [{ translateY: hoverTranslateY }] }}
          // @ts-ignore — web-only mouse events
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              onPress={onPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint={accessibilityHint}
              testID={testID}
              style={{ cursor: 'pointer' }}
            >
              <CardContent />
            </Pressable>
          </Animated.View>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          testID={testID}
        >
          <CardContent />
        </Pressable>
      </Animated.View>
    );
  }

  return <CardContent />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
  cardRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
});
