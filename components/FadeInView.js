// components/FadeInView.js
// Vista con animación de fade in automática - Optimizada con memo
import React, { useEffect, useRef, memo } from 'react';
import { Animated } from 'react-native';

const FadeInView = memo(function FadeInView({ 
  children, 
  duration = 400, 
  delay = 0, 
  style = {},
  from = 0,
  to = 1 
}) {
  const fadeAnim = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: to,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [duration, delay, to, fadeAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
});

export default FadeInView;
