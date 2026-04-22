/**
 * GlassmorphicPieChart.js
 * Componente de gráfico circular/dona con glasmorphism
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Svg, Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicPieChart = ({
  data = [], // [{ label, value, color }, ...]
  title,
  size = 200,
  showLegend = true,
  variant = 'pie', // 'pie' or 'donut'
  style,
}) => {
  const { theme, isDark } = useTheme();

  const total = useMemo(
    () => data.reduce((sum, item) => sum + (item.value || 0), 0),
    [data]
  );

  const segments = useMemo(() => {
    let startAngle = -90;
    return data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const endAngle = startAngle + angle;
      const segment = { ...item, percentage, startAngle, endAngle };
      startAngle = endAngle;
      return segment;
    });
  }, [data, total]);

  const styles = useMemo(
    () => createStyles(theme, isDark, size),
    [theme, isDark, size]
  );

  const radius = size / 2 - 20;
  const innerRadius = variant === 'donut' ? radius * 0.6 : 0;

  const polarToCartesian = (angle) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: size / 2 + radius * Math.cos(radians),
      y: size / 2 + radius * Math.sin(radians),
    };
  };

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'web' ? (
        <View style={styles.backdrop} />
      ) : (
        <BlurView intensity={75} style={styles.backdrop} />
      )}

      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}

      {/* SVG Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          {segments.map((segment, index) => {
            const start = polarToCartesian(segment.startAngle);
            const end = polarToCartesian(segment.endAngle);
            const largeArc = segment.angle > 180 ? 1 : 0;
            const color = segment.color || theme.primary;

            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill={color}
                opacity={0.8}
              />
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {segments.map((segment, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: segment.color || theme.primary },
                ]}
              />
              <View style={styles.legendText}>
                <Text
                  style={[styles.legendLabel, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {segment.label}
                </Text>
                <Text style={[styles.legendValue, { color: theme.textMuted }]}>
                  {segment.value} ({segment.percentage.toFixed(0)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Highlight & Glow */}
      <View style={styles.highlight} />
      <View
        style={[
          styles.rimGlow,
          { borderColor: theme.glassBorder },
        ]}
      />
    </View>
  );
};

const createStyles = (theme, isDark, size) =>
  StyleSheet.create({
    container: {
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      padding: 16,
      position: 'relative',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 12,
      zIndex: 1,
    },
    chartWrapper: {
      width: size,
      height: size,
      alignSelf: 'center',
      marginBottom: 12,
      zIndex: 1,
    },
    legend: {
      gap: 8,
      zIndex: 1,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    legendText: {
      flex: 1,
      gap: 2,
    },
    legendLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    legendValue: {
      fontSize: 11,
    },
    highlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.3)',
    },
    rimGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderRadius: 16,
      pointerEvents: 'none',
    },
  });

export default GlassmorphicPieChart;
