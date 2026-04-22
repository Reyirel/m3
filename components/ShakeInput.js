// components/ShakeInput.js
// Input con animación de shake para errores y feedback visual
import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { TextInput, Animated, StyleSheet } from 'react-native';
import { hapticMedium } from '../utils/haptics';

const ShakeInput = forwardRef(({ 
  error = false,
  style,
  errorColor = '#FF3B30',
  ...props 
}, ref) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [hasError, setHasError] = useState(error);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    shake: () => {
      triggerShake();
    },
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

  const triggerShake = useCallback(() => {
    hapticMedium();
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    setHasError(error);
    if (error) triggerShake();
  }, [error, triggerShake]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: shakeAnim }],
          borderColor: hasError ? errorColor : '#E5E5EA',
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[styles.input, style]}
        {...props}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
});

export default ShakeInput;
