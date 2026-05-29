/**
 * ScreenTransition.js
 * Animaciones de transición entre pantallas - Luxury style
 * Similar a Apple, Figma, Premium apps
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ScreenTransition({
  type = 'slideLeft', // slideLeft | slideUp | fadeScale | morphSlide | blurFade
  duration = 400,
  children,
  active = true,
}) {
  const { isDark } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (active) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: duration,
        useNativeDriver: true,
      }).start();
    }
  }, [active, duration]);

  const getAnimatedStyle = () => {
    switch (type) {
      case 'slideLeft':
        return {
          opacity: animValue,
          transform: [
            {
              translateX: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
        };

      case 'slideUp':
        return {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [height * 0.3, 0],
              }),
            },
          ],
        };

      case 'fadeScale':
        return {
          opacity: animValue,
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        };

      case 'morphSlide':
        return {
          opacity: animValue,
          transform: [
            {
              translateX: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [width * 0.5, 0],
              }),
            },
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
            {
              rotateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['45deg', '0deg'],
              }),
            },
          ],
        };

      case 'blurFade':
      default:
        return {
          opacity: animValue,
        };
    }
  };

  return (
    <Animated.View style={[styles.container, getAnimatedStyle()]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
