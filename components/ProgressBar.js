// components/ProgressBar.js
// Barra de progreso estática — sin Animated para no bloquear el hilo JS en web
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProgressBar = memo(function ProgressBar({
  progress = 0,
  size = 'medium',
  showLabel = true,
  color = '#9F2241',
  label = 'Progreso',
  height = null,
}) {
  const sizeConfig = {
    small:  { height: 4,  labelSize: 12 },
    medium: { height: 8,  labelSize: 14 },
    large:  { height: 12, labelSize: 16 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const barHeight = height || config.height;
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const getColor = (p) => {
    if (p < 33) return '#EF4444';
    if (p < 66) return '#F59E0B';
    return color;
  };

  const barColor = getColor(clamped);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { fontSize: config.labelSize }]}>{label}</Text>
          <Text style={[styles.percentage, { fontSize: config.labelSize, color: barColor }]}>
            {clamped}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height: barHeight }]}>
        <View style={[styles.fill, { height: barHeight, width: `${clamped}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';
export default ProgressBar;

const styles = StyleSheet.create({
  container: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontWeight: '600', color: '#333' },
  percentage: { fontWeight: '700' },
  track: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { borderRadius: 999 },
});
