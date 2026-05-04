/**
 * GlassmorphicInput.js - Input mejorado con glassmorphism
 * 
 * Wrapper de TextInput con PremiumGlassCard y animaciones
 * Soporta validación, placeholder animado, y efectos visuales
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PremiumGlassCard } from './index';

const GlassmorphicInput = React.forwardRef(({
  label,
  value = '',
  onChangeText = () => {},
  placeholder = '',
  placeholderTextColor,
  icon,
  error = '',
  maxLength = 100,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  editable = true,
  showCharCount = true,
  intensity = 'medium',
  glowOnFocus = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}, ref) => {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(glowAnim, {
      toValue: isFocused ? 1 : 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isFocused, glowAnim]);

  const focusOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
        </Text>
      )}
      
      <PremiumGlassCard
        intensity={intensity}
        glowEffect={glowOnFocus && isFocused}
        glowColor={error ? theme.error : theme.primary}
        pressable={false}
        padding={12}
        borderRadius={12}
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? theme.error : isFocused ? theme.primary : theme.border,
            borderWidth: error ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.inputContainer}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isFocused ? theme.primary : theme.textMuted}
              style={styles.icon}
            />
          )}
          
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || theme.textMuted}
            style={[
              styles.input,
              {
                color: theme.text,
                flex: 1,
              },
              multiline && { minHeight: numberOfLines * 20, textAlignVertical: 'top' },
            ]}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            keyboardType={keyboardType}
            editable={editable}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
          />
        </View>
      </PremiumGlassCard>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={theme.error} style={styles.errorIcon} />
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}

      {showCharCount && (
        <Text style={[styles.charCount, { color: theme.textMuted }]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
});

GlassmorphicInput.displayName = 'GlassmorphicInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorIcon: {
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});

export default GlassmorphicInput;
