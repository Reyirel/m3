// components/PressableButton.js
// Botón con micro-interacciones (scale/bounce) para mejor feedback
import React, { useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { hapticLight } from '../utils/haptics';

const PressableButton = ({ 
  children, 
  onPress, 
  style,
  disabled = false,
  haptic = true,
  scaleValue = 0.95,
  ...props 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1.05,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
      ])
    ]).start();
  };

  const handlePress = () => {
    if (haptic) {
      hapticLight();
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, bounceAnim) }
            ],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default PressableButton;
