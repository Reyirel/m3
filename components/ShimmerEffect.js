// components/ShimmerEffect.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ShimmerEffect({ width = '100%', height = 60, borderRadius = 12, style = {} }) {
  const { isDark } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [translateX]);

  const translateXInterpolate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const baseColor = isDark ? '#2C2C2E' : '#E5E5EA';
  const shineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)';

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: baseColor, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: shineColor,
            transform: [{ translateX: translateXInterpolate }, { skewX: '-20deg' }],
            width: 120,
          },
        ]}
      />
    </View>
  );
}

/** Skeleton con forma de TaskCard — usar durante carga inicial */
export function TaskCardSkeleton() {
  const { isDark } = useTheme();
  const base = isDark ? '#2C2C2E' : '#E5E5EA';

  return (
    <View style={[skStyles.card, {
      backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    }]}>
      <View style={[skStyles.bar, { backgroundColor: base }]} />
      <View style={skStyles.inner}>
        <View style={skStyles.titleRow}>
          <ShimmerEffect width="62%" height={14} borderRadius={6} />
          <ShimmerEffect width="22%" height={20} borderRadius={99} />
        </View>
        <ShimmerEffect width="88%" height={11} borderRadius={5} style={{ marginTop: 7 }} />
        <ShimmerEffect width="58%" height={11} borderRadius={5} style={{ marginTop: 4 }} />
        <View style={skStyles.footer}>
          <ShimmerEffect width={64} height={22} borderRadius={99} />
          <ShimmerEffect width={80} height={22} borderRadius={99} />
          <ShimmerEffect width={54} height={22} borderRadius={99} />
        </View>
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginVertical: 5,
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: { width: 4 },
  inner: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
});
