/**
 * PremiumTooltip.js
 * Tooltip ultra-premium con glassmorphism y animations
 * Estilo: Figma, Linear, Stripe
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumTooltip({
  visible = false,
  text = 'Tooltip',
  position = { x: 0, y: 0 }, // { x, y } coordinates
  backgroundColor = 'dark', // dark | light | primary | success
  arrowDirection = 'up', // up | down | left | right
  onClose = () => {},
  children = null,
}) {
  const { theme, isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const bgConfig = {
    dark: { colors: ['rgba(30, 41, 59, 0.85)', 'rgba(15, 23, 42, 0.88)'], textColor: '#FFFFFF' },
    light: {
      colors: ['rgba(255, 255, 255, 0.9)', 'rgba(248, 249, 250, 0.92)'],
      textColor: '#1F2937',
    },
    primary: { colors: ['rgba(99, 102, 241, 0.85)', 'rgba(88, 80, 235, 0.88)'], textColor: '#FFFFFF' },
    success: {
      colors: ['rgba(16, 185, 129, 0.85)', 'rgba(5, 150, 105, 0.88)'],
      textColor: '#FFFFFF',
    },
  };

  const config = bgConfig[backgroundColor] || bgConfig.dark;

  const arrowSize = 10;
  const bgWidth = 160;
  const bgHeight = 50;

  let arrowStyle = {};
  let tooltipX = position.x;
  let tooltipY = position.y;

  const arrowPositions = {
    up: { bottom: -arrowSize, left: bgWidth / 2 - arrowSize / 2, transform: [{ rotate: '0deg' }] },
    down: { top: -arrowSize, left: bgWidth / 2 - arrowSize / 2, transform: [{ rotate: '180deg' }] },
    left: { right: -arrowSize, top: bgHeight / 2 - arrowSize / 2, transform: [{ rotate: '90deg' }] },
    right: { left: -arrowSize, top: bgHeight / 2 - arrowSize / 2, transform: [{ rotate: '-90deg' }] },
  };

  if (arrowDirection === 'up') tooltipY -= bgHeight + arrowSize + 8;
  else if (arrowDirection === 'down') tooltipY += arrowSize + 8;
  else if (arrowDirection === 'left') tooltipX -= bgWidth + arrowSize + 8;
  else if (arrowDirection === 'right') tooltipX += arrowSize + 8;

  if (visible) {
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: tooltipX,
            top: tooltipY,
            width: bgWidth,
            height: bgHeight,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateX: -bgWidth / 2 },
              { translateY: arrowDirection === 'up' ? 0 : arrowDirection === 'down' ? -bgHeight : -bgHeight / 2 },
            ],
            zIndex: 1000,
          },
        ]}
      >
        <BlurView intensity={60} tint={isDark ? 'dark' : 'light'}>
          <LinearGradient colors={config.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={[styles.tooltip, { width: bgWidth, height: bgHeight }]}>
              {/* Rim glow */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderWidth: 1,
                    borderRadius: 8,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                ]}
              />

              {/* Content */}
              <Text style={[styles.text, { color: config.textColor }]}>{text}</Text>

              {/* Arrow */}
              <View
                style={[
                  styles.arrow,
                  arrowPositions[arrowDirection],
                  {
                    width: arrowSize * 2,
                    height: arrowSize * 2,
                    borderLeftWidth: arrowSize,
                    borderRightWidth: arrowSize,
                    borderTopWidth: arrowSize,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: config.colors[0],
                  },
                ]}
              />
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  tooltip: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
  },
});
