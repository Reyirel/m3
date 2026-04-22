/**
 * DashboardScreen.js
 * Pantalla de dashboard mejorada con estadísticas
 * Vista general de tareas, progreso y métricas
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicHeader,
  GlassmorphicCard,
  GlassmorphicStatsCard,
  GlassmorphicDivider,
  GlassmorphicProgress,
  GlassmorphicTabs,
  TaskCard,
} from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import AmbientOrbs from '../components/AmbientOrbs';
import { useResponsive } from '../utils/responsive';

const DashboardScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { tasks } = useTasks();
  const { isTablet } = useResponsive();

  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = tasks.filter(task => {
      const taskDate = new Date(task.createdAt || task.dueAt || 0);
      if (timeRange === 'week') return taskDate >= weekAgo;
      if (timeRange === 'month') return taskDate >= monthAgo;
      return true;
    });

    return {
      total: filtered.length,
      completed: filtered.filter(t => t.status === 'cerrada').length,
      inProgress: filtered.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso').length,
      pending: filtered.filter(t => t.status === 'pendiente').length,
      overdue: filtered.filter(t => t.isDueOverdue && t.status !== 'cerrada').length,
      urgent: filtered.filter(t => t.priority === 'alta').length,
      byPriority: {
        alta: filtered.filter(t => t.priority === 'alta').length,
        media: filtered.filter(t => t.priority === 'media').length,
        baja: filtered.filter(t => t.priority === 'baja').length,
      },
      byArea: [...new Set(filtered.map(t => t.area))].map(area => ({
        area,
        count: filtered.filter(t => t.area === area).length,
      })),
    };
  }, [tasks, timeRange]);

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const urgentTasks = tasks.filter(t => t.priority === 'alta' && t.status !== 'cerrada').slice(0, 3);

  const renderUrgentTask = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('TaskDetail', { task: item })}
    >
      <TaskCard task={item} />
    </TouchableOpacity>
  ), [navigation]);

  return (
    <View style={styles.container}>
      <AmbientOrbs intensity="medium" />

      {/* Header */}
      <GlassmorphicHeader
        title="Dashboard"
        subtitle="Resumen de tu productividad"
        icon="bars-chart-outline"
        showGradient={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Time Range Tabs */}
        <View style={styles.section}>
          <GlassmorphicTabs
            tabs={[
              { id: 'week', label: 'Esta semana', icon: 'calendar-outline' },
              { id: 'month', label: 'Este mes', icon: 'calendar' },
              { id: 'year', label: 'Este año', icon: 'stats-chart' },
            ]}
            activeTab={timeRange}
            onChange={setTimeRange}
          />
        </View>

        {/* Main Statistics Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Estadísticas Generales
          </Text>
          <View style={styles.statsGrid}>
            <GlassmorphicStatsCard
              icon="layers"
              title="Total"
              value={stats.total}
              change={`${stats.total} tareas`}
              color={theme.primary}
            />
            <GlassmorphicStatsCard
              icon="checkmark-circle"
              title="Completadas"
              value={stats.completed}
              change={`${completionRate}%`}
              color={theme.success}
            />
            <GlassmorphicStatsCard
              icon="play-circle"
              title="En Progreso"
              value={stats.inProgress}
              change={`${Math.round((stats.inProgress / stats.total) * 100) || 0}%`}
              color={theme.info}
            />
            <GlassmorphicStatsCard
              icon="alert-circle"
              title="Urgentes"
              value={stats.urgent}
              change={`${stats.urgent} pendientes`}
              color={theme.warning}
            />
          </View>
        </View>

        <GlassmorphicDivider />

        {/* Completion Progress */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Progreso General
          </Text>
          <GlassmorphicCard style={styles.progressCard}>
            <View style={styles.progressContent}>
              <View>
                <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                  Tasa de Completación
                </Text>
                <Text style={[styles.progressValue, { color: theme.primary }]}>
                  {completionRate}%
                </Text>
              </View>
              <GlassmorphicProgress
                value={completionRate}
                showLabel={true}
                color={theme.primary}
                size="large"
              />
            </View>
          </GlassmorphicCard>
        </View>

        {/* Priority Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Distribución por Prioridad
          </Text>
          <GlassmorphicCard>
            {[
              { label: 'Alta', value: stats.byPriority.alta, color: theme.error },
              { label: 'Media', value: stats.byPriority.media, color: theme.warning },
              { label: 'Baja', value: stats.byPriority.baja, color: theme.success },
            ].map((item, index) => (
              <View key={index}>
                <View style={[styles.priorityItem, { borderBottomColor: theme.border }]}>
                  <View style={styles.priorityInfo}>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={[styles.priorityLabel, { color: theme.text }]}>
                      {item.label}
                    </Text>
                  </View>
                  <Text style={[styles.priorityValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                </View>
                {index < 2 && <GlassmorphicDivider />}
              </View>
            ))}
          </GlassmorphicCard>
        </View>

        {/* Urgent Tasks */}
        {urgentTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Tareas Urgentes
            </Text>
            <FlatList
              data={urgentTasks}
              renderItem={renderUrgentTask}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>
        )}

        {/* Areas Overview */}
        {stats.byArea.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Tareas por Área
            </Text>
            <GlassmorphicCard>
              {stats.byArea.map((item, index) => (
                <View key={index}>
                  <View style={[styles.areaItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.areaInfo}>
                      <Ionicons
                        name="folder-outline"
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={[styles.areaName, { color: theme.text }]}>
                        {item.area || 'Sin área'}
                      </Text>
                    </View>
                    <Text style={[styles.areaCount, { color: theme.textSecondary }]}>
                      {item.count}
                    </Text>
                  </View>
                  {index < stats.byArea.length - 1 && (
                    <GlassmorphicDivider />
                  )}
                </View>
              ))}
            </GlassmorphicCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressCard: {
    padding: 16,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  priorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  areaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
  },
  areaCount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;
