/**
 * PremiumParticles.js
 * Partículas animadas ultra-premium
 * Crea efectos "wow" con partículas que flotan y se mueven
 * Estilo: usado en apps premium (Stripe, Figma, AbbyX)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumParticles({
  count = 15,
  type = 'floating', // floating | burst | trail | swirl
  colors = ['#6366F1', '#8B5CF6', '#EC4899'],
  intensity = 'medium', // light | medium | heavy
  animated = true,
  style,
}) {
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const particlesRef = useRef([]);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array(count)
      .fill(null)
      .map(() => ({
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        opacity: new Animated.Value(0.3 + Math.random() * 0.5),
        scale: new Animated.Value(0.5 + Math.random() * 1),
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 4 + 2,
        duration: 3000 + Math.random() * 2000,
      }));
  }, [count, colors]);

  // Animation loop
  useEffect(() => {
    if (!animated) return;

    const animations = particlesRef.current.map((particle) => {
      if (type === 'floating') {
        // Floating animation - moves slowly up/down
        return Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: particle.y._value - 100,
                duration: particle.duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.6,
                duration: particle.duration / 2,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: particle.y._value + 100,
                duration: particle.duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.2,
                duration: particle.duration / 2,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
      } else if (type === 'swirl') {
        // Swirl animation - circular movement
        return Animated.loop(
          Animated.timing(particle.scale, {
            toValue: particle.scale._value + 0.3,
            duration: particle.duration,
            useNativeDriver: true,
          })
        );
      }
      return null;
    });

    animations.forEach((anim) => {
      if (anim) anim.start();
    });

    return () => {
      animations.forEach((anim) => {
        if (anim) anim.stop();
      });
    };
  }, [animated, type]);

  const intensityConfig = {
    light: 0.3,
    medium: 0.5,
    heavy: 0.7,
  };

  const baseOpacity = intensityConfig[intensity] || intensityConfig.medium;

  return (
    <View style={[styles.container, style]}>
      {particlesRef.current.map((particle, idx) => (
        <Animated.View
          key={idx}
          style={[
            {
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: particle.color,
              opacity: Animated.multiply(particle.opacity, baseOpacity),
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
              shadowColor: particle.color,
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
});
