import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPRING, spring } from '../../theme/motion';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost'
  size = 'large',       // 'large' | 'medium'
  // Color del texto y del borde en la variante 'ghost' (p. ej. theme.error para salir)
  color,
  // Estilo del contenedor: para repartir el ancho en una fila (flex)
  style,
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    spring(scaleAnim, 0.97, SPRING.press).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    spring(scaleAnim, 1, SPRING.press).start();
  }, [scaleAnim]);

  const bgColor = variant === 'primary' ? theme.primary
    : variant === 'secondary' ? theme.surfaceL2
    : 'transparent';

  const textColor = variant === 'primary' ? '#FFFFFF'
    : variant === 'secondary' ? theme.text
    : (color || theme.primary);

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={isDisabled}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <Animated.View
        style={[
          styles.base,
          size === 'large' ? styles.large : styles.medium,
          {
            backgroundColor: bgColor,
            borderColor: variant === 'ghost' ? (color || theme.primary) : 'transparent',
            shadowColor: variant === 'primary' ? theme.primary : 'transparent',
            opacity: isDisabled ? 0.6 : 1,
          },
          variant === 'ghost' && styles.ghost,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={textColor} />
            <Text style={[styles.label, { color: textColor }]}>{title}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: textColor }]}>{title}</Text>
            {icon && <Ionicons name={icon} size={18} color={textColor} />}
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  large: {
    height: 54,
    paddingHorizontal: 24,
  },
  medium: {
    height: 44,
    paddingHorizontal: 18,
  },
  ghost: {
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
