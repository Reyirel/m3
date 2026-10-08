// components/FadeInView.js
// Vista con animación de fade in automática - Optimizada con memo
import React, { useEffect, useRef, memo } from 'react';
import { Animated } from 'react-native';
import { DURATION, timing } from '../theme/motion';

const FadeInView = memo(function FadeInView({
  children,
  duration = DURATION.normal,
  delay = 0,
  style = {},
  from = 0,
  to = 1
}) {
  const fadeAnim = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    timing(fadeAnim, to, { duration, delay }).start();
  }, [duration, delay, to, fadeAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
});

export default FadeInView;
