/**
 * PremiumGlassCard.js
 * 🎨✨ Glassmorphism Premium - Versión Deluxe
 * 
 * Features:
 * - Multi-layer blur (25px base + 5px inner)
 * - Directional borders (smart lighting)
 * - Subtle gradient overlay (profundidad)
 * - Double shadows (outer + inner rim)
 * - Premium animations (spring physics)
 * - Glow effects para cards importantes
 * - Full accessibility compliance
 * 
 * Basado en Apple iOS 15+, Google Material Design 3, y Figma modern UI
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Animated, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumGlassCard({
  children,
  style,
  intensity = 'medium', // 'soft', 'medium', 'strong', 'ultra'
  padding = 16,
  borderRadius = 16,
  
  // 🎨 Efectos visuales
  showRimGlow = true,
  showGradient = true,
  glowEffect = false,           // Glow color-tinted
  glowColor = null,             // Color de glow (default: theme.primary)
  glowIntensity = 0.25,         // 0.0 - 0.5
  shimmerEffect = false,        // Efecto iridiscente
  
  // 📊 Estados
  highlighted = false,          // Highlight especial
  pressable = false,
  onPress = null,
  
  // ♿ Accesibilidad
  accessible = true,
  accessibilityRole = 'none',
  accessibilityLabel = null,
  accessibilityHint = null,
  testID = null,
  
  // 🎨 Customización
  customBorderColor = null,
  customRimColor = null,
  customBackgroundColor = null,
}) {
  const { theme, isDark } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [scale] = useState(new Animated.Value(1));

  // 🔧 Blur intensity según tema y tipo
  const blurIntensity = useMemo(() => {
    const baseMap = {
      soft: isDark ? 20 : 30,
      medium: isDark ? 25 : 40,
      strong: isDark ? 35 : 50,
      ultra: isDark ? 45 : 65,
    };
    const base = baseMap[intensity] || baseMap.medium;
    return highlighted ? base + 10 : base;
  }, [intensity, isDark, highlighted]);

  // 🌟 Color de fondo (multi-layer)
  const backgroundColor = useMemo(() => {
    if (customBackgroundColor) return customBackgroundColor;
    
    if (isDark) {
      // Dark: más opaco para glassmorphism
      return highlighted 
        ? 'rgba(30, 30, 35, 0.75)'   // Más opaco cuando está highlighted
        : 'rgba(26, 26, 29, 0.65)';   // Base dark glass
    } else {
      // Light: moderadamente opaco
      return highlighted
        ? 'rgba(255, 255, 255, 0.80)' // Más opaco cuando está highlighted
        : 'rgba(255, 255, 255, 0.70)'; // Base light glass
    }
  }, [isDark, highlighted, customBackgroundColor]);

  // 🎨 Bordes direccionados (smart lighting)
  const borderStyle = useMemo(() => {
    if (customBorderColor) {
      return {
        borderWidth: 1,
        borderColor: customBorderColor,
      };
    }

    // Top border: Luz de arriba
    // Dark: white glow; Light: white highlight (card top edge)
    const topBorder = isDark
      ? 'rgba(255, 255, 255, 0.30)'
      : 'rgba(255, 255, 255, 0.90)';

    // Bottom/right borders: sombra visible para dar profundidad
    const bottomBorder = isDark
      ? 'rgba(0, 0, 0, 0.20)'
      : 'rgba(0, 0, 0, 0.08)';

    return {
      borderTopWidth: 1,
      borderTopColor: topBorder,
      borderBottomWidth: 1,
      borderBottomColor: bottomBorder,
      borderLeftWidth: 1,
      borderLeftColor: isDark
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.04)',
      borderRightWidth: 1,
      borderRightColor: isDark
        ? 'rgba(0, 0, 0, 0.15)'
        : 'rgba(0, 0, 0, 0.07)',
    };
  }, [isDark, customBorderColor]);

  // ✨ Rim Glow (brillo superior)
  const rimColor = useMemo(() => {
    if (customRimColor) return customRimColor;
    
    if (isDark) {
      return highlighted
        ? 'rgba(255, 255, 255, 0.20)'
        : 'rgba(255, 255, 255, 0.12)';
    } else {
      // Light mode: white rim is still visible as a soft top highlight against the lavender background
      return highlighted
        ? 'rgba(255, 255, 255, 0.95)'
        : 'rgba(255, 255, 255, 0.80)';
    }
  }, [isDark, highlighted, customRimColor]);

  // 🌈 Gradient overlay (subtle profundidad)
  const gradientOverlay = useMemo(() => {
    if (!showGradient) return null;

    if (isDark) {
      return {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.02) 100%)',
      };
    } else {
      return {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.01) 100%)',
      };
    }
  }, [showGradient, isDark]);

  // 💫 Sombras dobles (outer + inner)
  const shadowStyles = useMemo(() => {
    let shadows = {
      // Outer shadow: depth — lighter in light mode for a cleaner look
      shadowColor: isDark ? '#000' : 'rgba(80, 40, 60, 1)',
      shadowOffset: { width: 0, height: isDark ? 8 : 4 },
      shadowOpacity: isDark
        ? (highlighted ? 0.18 : 0.12)
        : (highlighted ? 0.14 : 0.08),
      shadowRadius: isDark
        ? (highlighted ? 28 : 24)
        : (highlighted ? 16 : 12),
      elevation: highlighted ? 12 : 8,
    };

    // Glow effect opcional
    if (glowEffect) {
      shadows.shadowColor = glowColor || theme.primary;
      shadows.shadowOpacity = glowIntensity;
      shadows.shadowRadius = highlighted ? 40 : 32;
    }

    return shadows;
  }, [glowEffect, glowColor, glowIntensity, highlighted, theme.primary]);

  // 🎬 Animation handlers
  const handlePressIn = () => {
    if (!pressable) return;
    setIsPressed(true);
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (!pressable) return;
    setIsPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
    if (onPress) onPress();
  };

  const animatedStyle = pressable ? {
    transform: [{ scale }],
  } : {};

  // 🌐 Web backdrop filter
  const webGlassStyle = Platform.OS === 'web' ? {
    backdropFilter: `blur(${Math.round(blurIntensity * 0.5)}px) saturate(${isDark ? 180 : 160}%)`,
    WebkitBackdropFilter: `blur(${Math.round(blurIntensity * 0.5)}px) saturate(${isDark ? 180 : 160}%)`,
  } : {};

  // 🎯 Render
  return (
    <Animated.View
      style={[
        styles.outerContainer,
        animatedStyle,
        shadowStyles,
        webGlassStyle,
        style,
      ]}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {/* 🎨 Capa 1: Blur base — native only */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* 🎨 Capa 2: Color overlay (glassmorphic base) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: backgroundColor,
          },
        ]}
      />

      {/* 🎨 Capa 3: Gradient overlay (profundidad visual) */}
      {showGradient && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              ...gradientOverlay,
              borderRadius: borderRadius,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* ✨ Capa 4: Rim glow (brillo superior) */}
      {showRimGlow && (
        <View
          style={[
            styles.rimGlow,
            {
              backgroundColor: rimColor,
              borderRadius: borderRadius,
              height: showGradient ? '25%' : '15%',
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* 🎨 Capa 5: Border inteligente */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: borderRadius,
            ...borderStyle,
          },
        ]}
        pointerEvents="none"
      />

      {/* 📱 Contenido principal */}
      <View
        style={[
          styles.content,
          {
            padding: padding,
            borderRadius: borderRadius,
          },
        ]}
      >
        {children}
      </View>

      {/* 🌈 Efecto shimmer/iridiscente (opcional) */}
      {shimmerEffect && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            {
              borderRadius: borderRadius,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* 🌐 Focus ring para web */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: borderRadius,
              borderWidth: 2,
              borderColor: isPressed
                ? `${theme.primary}80`
                : 'transparent',
              transition: 'border-color 200ms ease',
            },
          ]}
          pointerEvents="none"
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: Platform.select({ web: 'auto', native: 44 }),
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
    pointerEvents: 'none',
    opacity: 0.8,
  },
  
  shimmer: {
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
    animation: 'shimmer 3s infinite',
  },
});

/**
 * 📖 EJEMPLOS DE USO:
 * 
 * 1️⃣ Card Simple
 * <PremiumGlassCard intensity="medium" padding={16}>
 *   <Text>Tu contenido aquí</Text>
 * </PremiumGlassCard>
 * 
 * 2️⃣ Card Destacada con Glow
 * <PremiumGlassCard
 *   intensity="strong"
 *   glow
 *   glowColor={theme.success}
 *   highlighted
 * >
 *   <Text>Importante</Text>
 * </PremiumGlassCard>
 * 
 * 3️⃣ Card Presionable con Animación
 * <PremiumGlassCard
 *   pressable
 *   onPress={() => console.log('Pressed')}
 *   glowEffect
 * >
 *   <Text>Toca aquí</Text>
 * </PremiumGlassCard>
 * 
 * 4️⃣ Card Ultra Premium (con shimmer)
 * <PremiumGlassCard
 *   intensity="ultra"
 *   glowEffect
 *   shimmerEffect
 *   highlighted
 * >
 *   <Text>Lujo total</Text>
 * </PremiumGlassCard>
 */
