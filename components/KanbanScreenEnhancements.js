/**
 * KanbanScreenEnhancements.js
 * Componentes mejorados para KanbanScreen usando glassmorphism
 * Estos componentes encapsulan la lógica de mejora del KanbanScreen
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { GlassmorphicStatsCard, GlassmorphicFilterChips } from './index';
import { useTheme } from '../contexts/ThemeContext';

/**
 * KanbanQuickStats
 * Muestra estadísticas rápidas del tablero
 */
export const KanbanQuickStats = ({ stats, onStatClick }) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.statsContainer}
      contentContainerStyle={styles.statsContent}
    >
      <GlassmorphicStatsCard
        icon="layers"
        title="Total"
        value={stats.totalCount || 0}
        color={theme.primary}
        compact={true}
        onPress={() => onStatClick?.('total')}
      />
      <GlassmorphicStatsCard
        icon="time-outline"
        title="Pendientes"
        value={stats.pendingCount || 0}
        color={theme.warning}
        compact={true}
        onPress={() => onStatClick?.('pending')}
      />
      <GlassmorphicStatsCard
        icon="play-circle"
        title="En Proceso"
        value={stats.inProgressCount || 0}
        color={theme.info}
        compact={true}
        onPress={() => onStatClick?.('inProgress')}
      />
      <GlassmorphicStatsCard
        icon="checkmark-circle"
        title="Completadas"
        value={stats.completedCount || 0}
        color={theme.success}
        compact={true}
        change={stats.completedToday}
        onPress={() => onStatClick?.('completed')}
      />
      <GlassmorphicStatsCard
        icon="alert-circle"
        title="Vencidas"
        value={stats.overdueCount || 0}
        color={theme.error}
        compact={true}
        onPress={() => onStatClick?.('overdue')}
      />
    </ScrollView>
  );
};

/**
 * KanbanQuickFilters
 * Botones de filtro rápido usando chips glasmorphic
 */
export const KanbanQuickFilters = ({ 
  filters, 
  onFilterChange, 
  availableFilters = [],
  selectedFilters = [],
}) => {
  const handleChange = (ids) => {
    onFilterChange?.(ids);
  };

  return (
    <View style={styles.filtersContainer}>
      <GlassmorphicFilterChips
        items={availableFilters}
        selectedIds={selectedFilters}
        onSelectChange={handleChange}
        variant="filter"
        horizontal={true}
      />
    </View>
  );
};

/**
 * KanbanStatsPanel
 * Panel de estadísticas detalladas
 */
export const KanbanStatsPanel = ({ stats, tasksByStatus }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.panelContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Estadísticas por estado */}
        {Object.entries(tasksByStatus || {}).map(([status, data]) => {
          const percentage = data.total > 0 ? ((data.count || 0) / data.total) * 100 : 0;
          return (
            <View key={status} style={styles.statRow}>
              <GlassmorphicStatsCard
                icon="layers"
                title={status}
                value={data.count || 0}
                color={theme.primary}
                compact={false}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  statsContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  panelContainer: {
    flex: 1,
    padding: 12,
  },
  statRow: {
    marginBottom: 12,
  },
});

export default {
  KanbanQuickStats,
  KanbanQuickFilters,
  KanbanStatsPanel,
};
