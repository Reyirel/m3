/**
 * PremiumSkeletonLoader.js
 * Skeleton loader con shimmer animado - Premium loading state
 * Similar a Stripe, Apple, Revolut
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumSkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  animated = true,
  count = 3,
  variant = 'default', // default | card | avatar | line
  style,
}) {
  const { theme, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [animated]);

  const shimmerX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-1, 1],
  });

  const bgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)';

  const renderSkeleton = (index) => {
    let itemHeight = height;
    let itemRadius = borderRadius;
    let itemWidth = width;
    let marginBottom = 12;

    if (variant === 'card') {
      if (index === 0) {
        itemHeight = 160;
      } else if (index === 1) {
        itemHeight = 30;
        itemWidth = '70%';
      } else {
        itemHeight = 16;
        itemWidth = '90%';
      }
      itemRadius = 12;
    } else if (variant === 'avatar') {
      itemHeight = 48;
      itemWidth = 48;
      itemRadius = 24;
      marginBottom = 8;
    } else if (variant === 'line') {
      itemHeight = 12;
    }

    return (
      <View key={index} style={{ marginBottom }}>
        <Animated.View
          style={{
            width: itemWidth,
            height: itemHeight,
            borderRadius: itemRadius,
            backgroundColor: bgColor,
            overflow: 'hidden',
            transform: [
              {
                translateX: shimmerX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-itemWidth * 2, itemWidth * 2],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={[
              bgColor,
              shimmerColor,
              shimmerColor,
              bgColor,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flex: 1,
              width: itemWidth * 3,
            }}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={style}>
      {Array(count)
        .fill(0)
        .map((_, idx) => renderSkeleton(idx))}
    </View>
  );
}

const styles = StyleSheet.create({});
