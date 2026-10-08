// components/PulsingDot.js
// Dot animado con pulso para notificaciones
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { loop, timing } from '../theme/motion';

const PulsingDot = ({ 
  size = 12,
  color = '#FF3B30',
  pulseColor = 'rgba(255, 59, 48, 0.3)',
  duration = 1500,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = loop(
      Animated.sequence([
        timing(pulseAnim, 1, { duration: duration }),
        timing(pulseAnim, 0, { duration: duration }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [duration, pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: pulseColor,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
});

export default PulsingDot;
