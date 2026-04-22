/**
 * PremiumSegmentControl.js
 * Segment control ultra-premium estilo Stripe/Apple
 * Con glassmorphism y smooth animations
 */

import React, { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumSegmentControl({
  segments = ['Option 1', 'Option 2', 'Option 3'],
  selectedIndex = 0,
  onValueChange = () => {},
  color = 'primary',
  size = 'medium',
}) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const segmentWidth = width / segments.length - 8;
  const indicatorPos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(indicatorPos, {
      toValue: selectedIndex * (segmentWidth + 8),
      tension: 50,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, segmentWidth]);

  const colorConfig = {
    primary: { gradient: ['#6366F1', '#8B5CF6'], glow: '#6366F1' },
    success: { gradient: ['#10B981', '#059669'], glow: '#10B981' },
    warning: { gradient: ['#F59E0B', '#D97706'], glow: '#F59E0B' },
    danger: { gradient: ['#EF4444', '#DC2626'], glow: '#EF4444' },
  };

  const colorData = colorConfig[color] || colorConfig.primary;
  const sizeData = size === 'small' ? 32 : size === 'large' ? 48 : 40;

  return (
    <BlurView intensity={isDark ? 50 : 70} tint={isDark ? 'dark' : 'light'}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            height: sizeData,
            borderRadius: sizeData / 2,
            padding: 4,
          },
        ]}
      >
        {/* Rim glow */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 1,
              borderRadius: sizeData / 2,
              borderColor: 'rgba(255, 255, 255, 0.15)',
            },
          ]}
        />

        {/* Animated indicator background */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: segmentWidth,
              height: sizeData - 8,
              borderRadius: (sizeData - 8) / 2,
              transform: [{ translateX: indicatorPos }],
              top: 4,
              left: 4,
            },
          ]}
        >
          <LinearGradient
            colors={colorData.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              {
                flex: 1,
                borderRadius: (sizeData - 8) / 2,
              },
            ]}
          >
            {/* Indicator rim */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderWidth: 1,
                  borderRadius: (sizeData - 8) / 2,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              ]}
            />

            {/* Shine */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: (sizeData - 8) / 2,
                },
              ]}
            />
          </LinearGradient>
        </Animated.View>

        {/* Segment buttons */}
        <View style={styles.segmentsContainer}>
          {segments.map((segment, idx) => (
            <Pressable
              key={idx}
              onPress={() => onValueChange(idx)}
              style={[
                styles.segment,
                {
                  width: segmentWidth,
                  height: sizeData - 8,
                  borderRadius: (sizeData - 8) / 2,
                },
              ]}
            >
              {({ pressed }) => (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Animated.Text
                    style={{
                      fontSize: sizeData === 32 ? 12 : sizeData === 48 ? 14 : 13,
                      fontWeight: selectedIndex === idx ? '700' : '600',
                      color:
                        selectedIndex === idx
                          ? '#FFFFFF'
                          : isDark
                          ? 'rgba(255,255,255,0.6)'
                          : 'rgba(0,0,0,0.6)',
                      letterSpacing: 0.3,
                    }}
                  >
                    {segment}
                  </Animated.Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentsContainer: {
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
    flex: 1,
    paddingHorizontal: 2,
  },
  segment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
