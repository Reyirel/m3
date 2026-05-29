// components/Input.js
// Input moderno con glasmorfismo, animaciones y validación visual
import { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Input({
  label = '',
  placeholder = '',
  value = '',
  onChangeText = () => {},
  icon = null,
  error = '',
  success = false,
  disabled = false,
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,          // Pasa directamente al TextInput (web: 'email', 'current-password', etc.)
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Animated values
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const labelColorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: isFocused ? 1.15 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, glowAnim, iconScaleAnim]);

  const borderColor = error
    ? theme.error
    : isFocused
    ? theme.inputBorderFocused
    : isDark ? theme.glassBorder : theme.border;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.01],
  });

  const iconColor = error
    ? theme.error
    : isFocused
    ? theme.primary
    : theme.textSecondary;

  return (
    <Animated.View style={[
      styles.container,
      style,
      { transform: [{ scale: glowScale }] },
    ]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: error ? theme.error : isFocused ? theme.primary : theme.textSecondary },
          ]}
        >
          {label}
        </Text>
      ) : null}

      {/* Animated glow halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 14,
            opacity: glowOpacity,
            shadowColor: error ? theme.error : theme.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
          },
        ]}
      />

      {/* Blur glass layer — native only; web usa backdropFilter en el contenedor */}
      {Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: 12, overflow: 'hidden', zIndex: -1 }]}>
          <BlurView
            intensity={isFocused ? 60 : 30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isFocused
              ? (isDark ? theme.glassStrong : 'rgba(255,255,255,0.85)')
              : (isDark ? theme.glass : 'rgba(255,255,255,0.60)'),
            borderColor,
            borderWidth: isFocused ? 2 : 1.5,
            // Web: backdropFilter con saturate para glass real
            ...(Platform.OS === 'web' ? {
              backdropFilter: `blur(${isFocused ? 24 : 16}px) saturate(180%)`,
              WebkitBackdropFilter: `blur(${isFocused ? 24 : 16}px) saturate(180%)`,
            } : {}),
          },
          disabled && styles.inputDisabled,
          multiline && { height: 100, alignItems: 'flex-start' },
        ]}
      >
        {icon && (
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScaleAnim }] }]}>
            <Ionicons
              name={icon}
              size={20}
              color={iconColor}
            />
          </Animated.View>
        )}

        <TextInput
          style={[
            styles.input,
            { color: theme.inputText },
            multiline && { height: 80, textAlignVertical: 'top' },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          accessible={true}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint || (error ? `Error: ${error}` : undefined)}
          accessibilityState={{ disabled }}
          testID={testID}
        />

        {(error || success) && (
          <View style={styles.statusIcon}>
            <Ionicons
              name={error ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={error ? theme.error : theme.success}
            />
          </View>
        )}
      </View>

      {/* Rim Glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: error
              ? theme.error + '55'
              : isDark ? theme.glassBorder : theme.glassBorderStrong,
            opacity: glowOpacity,
          },
        ]}
      />

      {error ? (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
  },
  statusIcon: {
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});
