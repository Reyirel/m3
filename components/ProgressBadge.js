// components/ProgressBadge.js
// Badge de estado con barra de progreso estática (sin Animated para no bloquear JS thread)
import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProgressBadge = memo(function ProgressBadge({
  status = 'pendiente',
  progress = 0,
  showProgress = false,
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pendiente':   return { color: '#FF9800', label: 'Pendiente',   bgColor: '#FFF3E0' };
      case 'en_proceso':  return { color: '#2196F3', label: 'En Proceso',  bgColor: '#E3F2FD' };
      case 'en_revision': return { color: '#9C27B0', label: 'En Revisión', bgColor: '#F3E5F5' };
      case 'cerrada':     return { color: '#4CAF50', label: 'Completada',  bgColor: '#E8F5E9' };
      default:            return { color: '#9E9E9E', label: status,         bgColor: '#F5F5F5' };
    }
  };

  const config = getStatusConfig();
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {showProgress && clamped > 0 && (
        <View
          style={[
            styles.progressBar,
            { backgroundColor: config.color + '40', width: `${clamped}%` },
          ]}
        />
      )}
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        {showProgress && clamped > 0 && (
          <Text style={[styles.percentage, { color: config.color }]}>{clamped}%</Text>
        )}
      </View>
    </View>
  );
});

export default ProgressBadge;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  percentage: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
});
