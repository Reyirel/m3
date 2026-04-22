// components/ShimmerEffect.js
// Efecto shimmer para loaders más atractivos
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function ShimmerEffect({ width = '100%', height = 60, borderRadius = 12, style = {} }) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [translateX]);

  const translateXInterpolate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300]
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: translateXInterpolate }]
          }
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F5F5F5' }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  }
});
