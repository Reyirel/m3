// components/SkeletonLoader.js
// Skeleton loader animado con shimmer effect profesional
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function SkeletonLoader({ type = 'card', count = 3 }) {
  const { theme, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  // Theme-aware base and shimmer colors
  const baseBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const shimmerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const cardBg = isDark ? theme.glass : theme.glassStrong;
  const cardBorder = isDark ? theme.glassBorder : theme.glassBorderSubtle;

  const ShimmerOverlay = () => (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        { transform: [{ translateX }] },
      ]}
    >
      <View style={[styles.shimmerGradient, { backgroundColor: shimmerColor }]} />
    </Animated.View>
  );

  const SkeletonBlock = ({ style: blockStyle }) => (
    <View style={[styles.shimmerContainer, { backgroundColor: baseBg }, blockStyle]}>
      <ShimmerOverlay />
    </View>
  );

  if (type === 'bento') {
    return (
      <View style={styles.bentoContainer}>
        <View style={styles.bentoRow}>
          <SkeletonBlock style={styles.bentoLarge} />
          <SkeletonBlock style={styles.bentoMedium} />
        </View>
        <View style={styles.bentoRow}>
          <SkeletonBlock style={styles.bentoSmall} />
          <SkeletonBlock style={styles.bentoSmall} />
          <SkeletonBlock style={styles.bentoSmall} />
        </View>
        <View style={styles.bentoRow}>
          <SkeletonBlock style={styles.bentoWide} />
        </View>
      </View>
    );
  }

  if (type === 'card') {
    return (
      <View style={styles.cardContainer}>
        {[...Array(count)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <SkeletonBlock style={styles.titleSkeleton} />
              <SkeletonBlock style={styles.badgeSkeleton} />
            </View>
            <SkeletonBlock style={styles.metaSkeleton} />
            <SkeletonBlock style={styles.metaSmallSkeleton} />
          </View>
        ))}
      </View>
    );
  }

  if (type === 'list') {
    return (
      <View style={styles.cardContainer}>
        {[...Array(count)].map((_, index) => (
          <View
            key={index}
            style={[styles.listRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <SkeletonBlock style={styles.listAvatar} />
            <View style={styles.listContent}>
              <SkeletonBlock style={styles.listTitle} />
              <SkeletonBlock style={styles.listSubtitle} />
            </View>
            <SkeletonBlock style={styles.listBadge} />
          </View>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
    width: 350,
  },
  bentoContainer: {
    gap: 14,
    marginBottom: 32,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  bentoLarge: {
    flex: 2,
    minHeight: 180,
    borderRadius: 28,
  },
  bentoMedium: {
    flex: 1,
    minHeight: 180,
    borderRadius: 28,
  },
  bentoSmall: {
    flex: 1,
    minHeight: 140,
    borderRadius: 28,
  },
  bentoWide: {
    flex: 1,
    minHeight: 110,
    borderRadius: 28,
  },
  cardContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSkeleton: {
    width: '60%',
    height: 20,
    borderRadius: 8,
  },
  badgeSkeleton: {
    width: 70,
    height: 26,
    borderRadius: 10,
  },
  metaSkeleton: {
    width: '80%',
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  metaSmallSkeleton: {
    width: '40%',
    height: 12,
    borderRadius: 6,
  },
  // List type
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  listContent: {
    flex: 1,
    gap: 8,
  },
  listTitle: {
    height: 14,
    borderRadius: 6,
    width: '75%',
  },
  listSubtitle: {
    height: 12,
    borderRadius: 6,
    width: '50%',
  },
  listBadge: {
    width: 52,
    height: 24,
    borderRadius: 8,
    flexShrink: 0,
  },
});
