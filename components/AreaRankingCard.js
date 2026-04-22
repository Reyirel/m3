// components/AreaRankingCard.js
// Componente para mostrar ranking de áreas con información detallada

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function AreaRankingCard({
  areaMetrics = {},
  onAreaPress,
  _taskCountByArea = {},
  overdueByArea = {},
}) {
  const { theme, isDark } = useTheme();

  // Procesar datos
  const ranking = Object.entries(areaMetrics)
    .map(([name, metrics]) => {
      const completionRate = metrics.total > 0 
        ? Math.round((metrics.completed / metrics.total) * 100)
        : 0;
      
      return {
        name,
        completed: metrics.completed || 0,
        total: metrics.total || 0,
        completionRate,
        overdue: overdueByArea?.[name] || 0,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  const getPosition = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getMedalColor = (index) => {
    if (index === 0) return '#FBBF24'; // gold
    if (index === 1) return '#D1D5DB'; // silver
    if (index === 2) return '#D97706'; // bronze
    return theme.textSecondary;
  };

  const getStatusIcon = (rate) => {
    if (rate >= 85) return 'checkmark-circle';
    if (rate >= 60) return 'arrow-up-circle';
    if (rate >= 30) return 'alert-circle';
    return 'close-circle';
  };

  const getStatusColor = (rate) => {
    if (rate >= 85) return theme.success;
    if (rate >= 60) return theme.info;
    if (rate >= 30) return theme.warning;
    return theme.error;
  };

  if (ranking.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <Ionicons name="podium-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Sin datos de clasificación
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="podium-outline" size={24} color={theme.textSecondary} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Ranking de Áreas</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {ranking.length} área{ranking.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Rankings */}
      <View style={styles.rankingList}>
        {ranking.map((area, index) => (
          <TouchableOpacity 
            key={area.name}
            onPress={() => onAreaPress?.(area.name)}
            activeOpacity={0.7}
            style={styles.rankingItem}
          >
            {/* Posición */}
            <View style={styles.positionContainer}>
              <Text style={[styles.position, { color: getMedalColor(index) }]}>
                {getPosition(index)}
              </Text>
            </View>

            {/* Información del área */}
            <View style={styles.infoContainer}>
              <Text 
                style={[styles.areaName, { color: theme.text }]}
                numberOfLines={1}
              >
                {area.name}
              </Text>
              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="checkmark-done"
                    size={12}
                    color={theme.success}
                  />
                  <Text style={[styles.statText, { color: theme.textSecondary }]}>
                    {area.completed}
                  </Text>
                </View>
                
                {area.overdue > 0 && (
                  <>
                    <Text style={[styles.statSeparator, { color: theme.border }]}>•</Text>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="alert-circle"
                        size={12}
                        color={theme.error}
                      />
                      <Text style={[styles.statText, { color: theme.error }]}>
                        {area.overdue}
                      </Text>
                    </View>
                  </>
                )}

                <Text style={[styles.statSeparator, { color: theme.border }]}>•</Text>
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {area.total} total
                </Text>
              </View>
            </View>

            {/* Estado */}
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(area.completionRate)} 
                size={20} 
                color={getStatusColor(area.completionRate)}
              />
            </View>

            {/* Porcentaje */}
            <View style={styles.percentageContainer}>
              <Text style={[styles.percentage, { color: getStatusColor(area.completionRate) }]}>
                {area.completionRate}%
              </Text>
              <Text style={[styles.percentageLabel, { color: theme.textSecondary }]}>
                de {area.total}
              </Text>
            </View>

            {/* Divider */}
            <View 
              style={[
                styles.divider,
                { backgroundColor: theme.border }
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Estadísticas generales */}
      <View style={[styles.generalStats, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>
            Promedio General
          </Text>
          <Text style={[styles.statBoxValue, { color: theme.text }]}>
            {Math.round(
              ranking.reduce((sum, a) => sum + a.completionRate, 0) / ranking.length
            )}%
          </Text>
        </View>
        
        <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
          <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>
            Mejor Desempeño
          </Text>
          <View style={styles.bestPerformer}>
            <Text style={[styles.bestPerformerName, { color: '#FBBF24' }]}>
              {ranking[0]?.name}
            </Text>
            <Text style={[styles.bestPerformerRate, { color: theme.success }]}>
              {ranking[0]?.completionRate}%
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  rankingList: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  position: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statSeparator: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  statusContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 1,
  },
  generalStats: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  bestPerformer: {
    alignItems: 'center',
    gap: 2,
  },
  bestPerformerName: {
    fontSize: 11,
    fontWeight: '600',
  },
  bestPerformerRate: {
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
