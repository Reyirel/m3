// components/ProjectCard.js
// Tarjeta de proyecto compacta con progreso en tiempo real
// Sin LinearGradient para evitar saturación visual — usa borde izquierdo de color

import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ProgressBar from './ProgressBar';
import { subscribeToTaskProgress } from '../services/taskProgress';

const ProjectCard = memo(function ProjectCard({
  task,
  onPress,
  showSubtaskCount = true,
  compact = false,
}) {
  const { theme, isDark } = useTheme();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!task.id) return;
    const unsubscribe = subscribeToTaskProgress(task.id, (data) => {
      setProgressData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [task.id]);

  if (loading) {
    return (
      <View style={[styles.skeleton, { backgroundColor: theme.card }]}>
        <View style={[styles.skeletonLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', width: '70%' }]} />
      </View>
    );
  }

  const progress = progressData?.overallProgress || 0;
  const isComplete = progress === 100;

  const getHealthColor = () => {
    if (progress >= 80) return '#10B981';
    if (progress >= 50) return '#F59E0B';
    if (progress >= 20) return '#EF4444';
    return '#9CA3AF';
  };

  const healthColor = getHealthColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          borderLeftColor: healthColor,
        },
        compact && styles.compactContainer,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={compact ? 1 : 2}
          >
            {task.title}
          </Text>
          <Text style={[styles.area, { color: theme.textSecondary }]} numberOfLines={1}>
            {task.area || 'Sin área'}
          </Text>
        </View>
        {isComplete ? (
          <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.completeBadge} />
        ) : (
          <Text style={[styles.progressPct, { color: healthColor }]}>{Math.round(progress)}%</Text>
        )}
      </View>

      {/* Barra de progreso */}
      <View style={compact ? styles.compactProgressSection : styles.progressSection}>
        <ProgressBar
          progress={progress}
          size={compact ? 'small' : 'medium'}
          label={compact ? '' : 'Avance'}
          showLabel={!compact}
          color={healthColor}
        />
      </View>

      {/* Stats — solo en modo no-compacto */}
      {!compact && progressData && (
        <View style={[styles.stats, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {progressData.subtaskStats.completada}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Hechas</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {progressData.subtaskStats.en_proceso}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Proceso</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {progressData.subtaskStats.pendiente}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendientes</Text>
          </View>
          {showSubtaskCount && (
            <>
              <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {progressData.subtaskStats.total}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
              </View>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

export default ProjectCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
    marginHorizontal: 12,
    padding: 14,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  compactContainer: {
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  area: {
    fontSize: 12,
    fontWeight: '500',
  },
  completeBadge: {
    marginTop: 2,
  },
  progressPct: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 12,
  },
  compactProgressSection: {
    marginBottom: 0,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
  },
  skeleton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
});
