import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost'
  size = 'large',       // 'large' | 'medium'
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const bgColor = variant === 'primary' ? theme.primary
    : variant === 'secondary' ? theme.surfaceL2
    : 'transparent';

  const textColor = variant === 'primary' ? '#FFFFFF'
    : variant === 'secondary' ? theme.text
    : theme.primary;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={isDisabled}
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
            borderColor: variant === 'ghost' ? theme.primary : 'transparent',
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
    borderRadius: 14,
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
