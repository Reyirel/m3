/**
 * GlassmorphicChart.js
 * Componente de gráfico de barras con glasmorphism
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicChart = ({
  data = [], // [{ label, value, color }, ...]
  title,
  maxValue,
  animated = true,
  height = 200,
  barColor,
  showValues = true,
  variant = 'bar', // 'bar' or 'line'
  style,
}) => {
  const { theme, isDark } = useTheme();

  // Calculate max value from data if not provided
  const max = useMemo(
    () => maxValue || Math.max(...data.map(d => d.value || 0), 1),
    [data, maxValue]
  );

  const styles = useMemo(
    () => createStyles(theme, isDark, height),
    [theme, isDark, height]
  );

  const chartHeight = height - 60;

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

      <View style={[styles.chartContainer, { height: chartHeight }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {[100, 75, 50, 25, 0].map((percent, i) => (
            <View key={i} style={styles.yLabel}>
              <Text style={[styles.yLabelText, { color: theme.textMuted }]}>
                {Math.round((percent / 100) * max)}
              </Text>
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                {
                  bottom: `${percent}%`,
                  borderColor: theme.glassBorderSubtle,
                },
              ]}
            />
          ))}

          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const percentage = (item.value / max) * 100;
              const itemColor = item.color || barColor || theme.primary;

              return (
                <View key={index} style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${percentage}%`,
                        backgroundColor: itemColor,
                      },
                    ]}
                  >
                    {/* Bar highlight */}
                    <View style={styles.barHighlight} />
                  </View>
                  {showValues && percentage > 10 && (
                    <Text style={[styles.barValue, { color: theme.text }]}>
                      {item.value}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {data.map((item, index) => (
          <Text
            key={index}
            style={[styles.xLabel, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        ))}
      </View>

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

const createStyles = (theme, isDark, height) =>
  StyleSheet.create({
    container: {
      height,
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
    chartContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      zIndex: 1,
    },
    yAxis: {
      width: 40,
      justifyContent: 'space-between',
    },
    yLabel: {
      height: 0,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 4,
    },
    yLabelText: {
      fontSize: 10,
      fontWeight: '600',
    },
    chartArea: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      position: 'relative',
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      borderBottomWidth: 1,
    },
    barsContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    barWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    bar: {
      width: '100%',
      borderRadius: 8,
      backgroundColor: theme.primary,
      overflow: 'hidden',
      minHeight: 2,
    },
    barHighlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    barValue: {
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
    },
    xAxis: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginLeft: 40,
      gap: 4,
      zIndex: 1,
    },
    xLabel: {
      fontSize: 11,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
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

export default GlassmorphicChart;
