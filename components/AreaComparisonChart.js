// components/AreaComparisonChart.js
// Gráfico comparativo horizontal de áreas para visualizar rendimiento relativo

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

Dimensions.get('window');

export default function AreaComparisonChart({
  areaMetrics = {},
  onAreaSelect,
  _padding = 16,
  _isDesktop = false,
}) {
  const { theme, isDark } = useTheme();

  // Convertir datos a array y ordenar por completion rate
  const areas = Object.entries(areaMetrics)
    .map(([name, metrics]) => ({
      name,
      completed: metrics.completed || 0,
      total: metrics.total || 0,
      completionRate: metrics.total > 0 
        ? Math.round((metrics.completed / metrics.total) * 100)
        : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  if (areas.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <Ionicons name="bar-chart-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No hay datos de áreas disponibles
        </Text>
      </View>
    );
  }

  const maxRate = Math.max(...areas.map(a => a.completionRate), 100);
  const getBarColor = (rate) => {
    if (rate >= 85) return { start: theme.secondary, end: theme.secondary };
    if (rate >= 60) return { start: theme.info, end: theme.info };
    if (rate >= 30) return { start: theme.warning, end: theme.warning };
    return { start: theme.error, end: theme.error };
  };

  return (
    <ScrollView
      horizontal={false}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.container}
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Comparación de Rendimiento por Área
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Ordenado por porcentaje de completación
        </Text>
      </View>

      {/* Grid de barras */}
      <View style={styles.barsContainer}>
        {areas.map((area, index) => {
          const colors = getBarColor(area.completionRate);
          const barWidth = (area.completionRate / maxRate) * 100;
          const isTopPerformer = index === 0;
          const isLowPerformer = index === areas.length - 1 && area.completionRate < 50;

          return (
            <TouchableOpacity
              key={area.name}
              style={styles.barRow}
              onPress={() => onAreaSelect?.(area.name)}
              activeOpacity={0.7}
            >
              {/* Nombre del área */}
              <View style={styles.areaLabel}>
                {isTopPerformer && (
                  <Ionicons
                    name="trophy"
                    size={14}
                    color="#FBBF24"
                    style={styles.trophyIcon}
                  />
                )}
                <Text
                  style={[styles.areaName, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {area.name}
                </Text>
              </View>

              {/* Barra de progreso horizontal */}
              <View style={styles.barTrackContainer}>
                <LinearGradient
                  colors={[colors.start, colors.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                    },
                  ]}
                >
                  <View style={styles.barGloss} />
                </LinearGradient>

                {/* Indicador de alerta si está bajo */}
                {isLowPerformer && (
                  <View style={styles.alertIndicator}>
                    <Ionicons
                      name="alert-circle"
                      size={12}
                      color={theme.error}
                    />
                  </View>
                )}
              </View>

              {/* Estadísticas */}
              <View style={styles.stats}>
                <Text style={[styles.percentage, { color: theme.text }]}>
                  {area.completionRate}%
                </Text>
                <Text style={[styles.ratio, { color: theme.textSecondary }]}>
                  {area.completed}/{area.total}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer con leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.secondary }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Excelente (85%+)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.info }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Bueno (60%+)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.warning }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Atrasado (30%+)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.error }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Crítico (&lt;30%)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  barsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  areaLabel: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trophyIcon: {
    marginRight: 2,
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  barTrackContainer: {
    flex: 1,
    height: 32,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 30,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  barGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  alertIndicator: {
    position: 'absolute',
    right: 4,
    top: '50%',
    marginTop: -6,
  },
  stats: {
    width: 70,
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  ratio: {
    fontSize: 11,
    fontWeight: '500',
  },
  legend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.1)',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
