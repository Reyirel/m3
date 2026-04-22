// components/AnimatedBadge.js
// Badge con contador animado y efectos de entrada
// ⚡ Optimizado con React.memo
import React, { useEffect, useRef, memo } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';

const AnimatedBadge = memo(function AnimatedBadge({ 
  count = 0,
  color = '#FF3B30',
  textColor = '#FFFFFF',
  size = 24,
  style,
  showZero = false,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      // Animación de incremento
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
      ]).start();
    }

    if (count > 0 && prevCount.current === 0) {
      // Fade in cuando aparece por primera vez
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }).start();
    } else if (count === 0 && prevCount.current > 0) {
      // Fade out cuando llega a 0
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (count > 0) {
      fadeAnim.setValue(1);
    }

    prevCount.current = count;
  }, [count, scaleAnim, fadeAnim]);

  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: color,
          minWidth: size,
          height: size,
          borderRadius: size / 2,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: size * 0.55,
          },
        ]}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
});

AnimatedBadge.displayName = 'AnimatedBadge';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});

export default AnimatedBadge;
