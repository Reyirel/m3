/**
 * GlassmorphicButton.js - Botón mejorado con glassmorphism
 * 
 * Variantes: primary, secondary, danger, outline
 * Soporta loading, disabled, icons, y efectos visuales
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PremiumGlassCard } from '../index';

const GlassmorphicButton = ({
  title,
  children,
  onPress = () => {},
  variant = 'primary', // primary | secondary | danger | outline
  icon,
  loading = false,
  disabled = false,
  size = 'medium', // small | medium | large
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const label = title ?? children ?? 'Button';
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          glowColor: theme.error,
          intensity: 'strong',
          titleColor: '#FFFFFF',
          customBackgroundColor: theme.error,
          customBorderColor: theme.errorDark,
        };
      case 'secondary':
        return {
          glowColor: theme.secondary,
          intensity: 'medium',
          titleColor: isDark ? theme.text : theme.primary,
          customBackgroundColor: null,
          customBorderColor: null,
        };
      case 'outline':
        return {
          glowColor: 'transparent',
          intensity: 'soft',
          titleColor: theme.primary,
          customBackgroundColor: isDark ? null : 'rgba(159,34,65,0.06)',
          customBorderColor: isDark ? null : 'rgba(159,34,65,0.30)',
        };
      default: // primary
        return {
          glowColor: theme.primary,
          intensity: 'strong',
          titleColor: '#FFFFFF',
          customBackgroundColor: theme.buttonPrimaryBg,
          customBorderColor: theme.primaryDark,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { padding: 8, fontSize: 12 };
      case 'large':
        return { padding: 16, fontSize: 16 };
      default: // medium
        return { padding: 12, fontSize: 14 };
    }
  };

  const variantConfig = getVariantConfig();
  const sizeConfig = getSizeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={Platform.OS === 'web' ? { cursor: disabled || loading ? 'not-allowed' : 'pointer' } : undefined}
      >
        <PremiumGlassCard
          intensity={variantConfig.intensity}
          glowEffect={!disabled && !loading}
          glowColor={variantConfig.glowColor}
          highlighted={!disabled && !loading}
          pressable={false}
          padding={sizeConfig.padding}
          borderRadius={12}
          customBackgroundColor={variantConfig.customBackgroundColor}
          customBorderColor={variantConfig.customBorderColor}
          style={[
            styles.button,
            disabled && styles.disabled,
          ]}
        >
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="small" color={variantConfig.titleColor} />
            ) : (
              <>
                {icon && (
                  <Ionicons
                    name={icon}
                    size={sizeConfig.fontSize + 4}
                    color={variantConfig.titleColor}
                    style={styles.icon}
                  />
                )}
                <Text
                  style={[
                    styles.title,
                    {
                      fontSize: sizeConfig.fontSize,
                      color: variantConfig.titleColor,
                    },
                  ]}
                >
                  {label}
                </Text>
              </>
            )}
          </View>
        </PremiumGlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  fullWidth: {
    width: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default GlassmorphicButton;
