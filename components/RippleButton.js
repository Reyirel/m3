// components/RippleButton.js
// Botón con efecto ripple estilo Material Design
import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { hapticLight } from '../utils/haptics';
import { timing } from '../theme/motion';

const RippleButton = ({ 
  children, 
  onPress, 
  style,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  rippleDuration = 600,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
  ...props 
}) => {
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (_event) => {
    rippleAnim.setValue(0);
    rippleOpacity.setValue(1);
    
    Animated.parallel([
      timing(rippleAnim, 1, { duration: rippleDuration }),
      timing(rippleOpacity, 0, { duration: rippleDuration }),
    ]).start();
  };

  const handlePress = () => {
    hapticLight();
    if (onPress) {
      onPress();
    }
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[styles.container, style]}
      {...props}
    >
      <View style={styles.content}>
        {children}
      </View>
      <Animated.View
        style={[
          styles.ripple,
          {
            backgroundColor: rippleColor,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    zIndex: 1,
  },
  ripple: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
    zIndex: 0,
  },
});

export default RippleButton;
