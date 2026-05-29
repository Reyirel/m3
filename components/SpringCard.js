// components/SpringCard.js
// Card con animaciones de spring physics
// ⚡ Optimizado con React.memo
import React, { useRef, memo } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { hapticLight } from '../utils/haptics';

const SpringCard = memo(function SpringCard({ 
  children,
  onPress,
  style,
  springConfig = { tension: 300, friction: 10 },
  scaleDown = 0.95,
  ...props
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleDown,
        useNativeDriver: true,
        ...springConfig,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...springConfig,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start();
  };

  const handlePress = () => {
    hapticLight();
    if (onPress) {
      onPress();
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { scale: scaleAnim },
              { rotate },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});

SpringCard.displayName = 'SpringCard';

export default SpringCard;
