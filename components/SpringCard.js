// components/SpringCard.js
// Tarjeta que se encoge un poco al presionarla
// ⚡ Optimizado con React.memo
import React, { useRef, memo } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { hapticLight } from '../utils/haptics';
import { PRESS_SCALE, SPRING, spring } from '../theme/motion';

const SpringCard = memo(function SpringCard({
  children,
  onPress,
  style,
  springConfig = SPRING.press,
  scaleDown = PRESS_SCALE,
  ...props
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => spring(scaleAnim, scaleDown, springConfig).start();
  const handlePressOut = () => spring(scaleAnim, 1, springConfig).start();

  const handlePress = () => {
    hapticLight();
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});

SpringCard.displayName = 'SpringCard';

export default SpringCard;
