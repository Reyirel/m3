// components/AreaMetricsPanel.js
// Panel de métricas de área para secretarios
// Muestra el rendimiento de los directores de su área

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/tokens';
import { toMs } from '../utils/dateUtils';

const AreaMetricsPanel = ({ 
  userArea,
  tasks = [],
  showHeader = true,
  currentUserRole = 'secretario' // 'admin', 'secretario', 'director'
}) => {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [directors, setDirectors] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    avgCompletionRate: 0
  });
  const [sortBy, setSortBy] = useState('name'); // 'name', 'completed', 'pending', 'rate'
  const [sortOrder, setSortOrder] = useState('asc');

  const loadDirectors = useCallback(async () => {
    if (!userArea) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Solo filtrar por role, luego filtrar área en cliente (case-insensitive)
      const q = query(
        usersRef, 
        where('role', '==', 'director')
      );
      const snapshot = await getDocs(q);
      
      // Filtrar por área de forma case-insensitive
      const userAreaNorm = userArea.toLowerCase().trim();
      const directorsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(d => (d.area || '').toLowerCase().trim() === userAreaNorm);
      
      setDirectors(directorsData);
    } catch (error) {
      if (__DEV__) console.error('Error loading directors:', error);
    } finally {
      setLoading(false);
    }
  }, [userArea]);

  const calculateMetrics = useCallback(() => {
    // Filtrar tareas del área (normalizar case-insensitive)
    const userAreaNorm = (userArea || '').toLowerCase().trim();
    const areaTasks = tasks.filter(t => (t.area || '').toLowerCase().trim() === userAreaNorm);
    
    const now = Date.now();
    const completed = areaTasks.filter(t => t.status === 'cerrada' || t.status === 'completada').length;
    const pending = areaTasks.filter(t => t.status !== 'cerrada' && t.status !== 'completada').length;
    const overdue = areaTasks.filter(t => t.status !== 'cerrada' && t.status !== 'completada' && toMs(t.dueAt) < now).length;
    
    // Calcular métricas por director
    const directorMetrics = directors.map(director => {
      const directorEmail = director.email?.toLowerCase();
      
      // Tareas donde el director está involucrado
      const directorTasks = areaTasks.filter(task => {
        if (Array.isArray(task.assignedTo)) {
          return task.assignedTo.some(a => a.toLowerCase() === directorEmail);
        }
        return task.assignedTo?.toLowerCase() === directorEmail;
      });
      
      const dirCompleted = directorTasks.filter(t => t.status === 'cerrada').length;
      const dirPending = directorTasks.filter(t => t.status !== 'cerrada').length;
      const dirOverdue = directorTasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) < now).length;
      const completionRate = directorTasks.length > 0 
        ? Math.round((dirCompleted / directorTasks.length) * 100) 
        : 0;
      
      // Verificar confirmaciones individuales
      const confirmedTasks = directorTasks.filter(t => {
        if (!t.completedBy || !Array.isArray(t.completedBy)) return false;
        return t.completedBy.includes(directorEmail);
      }).length;
      
      return {
        ...director,
        totalTasks: directorTasks.length,
        completed: dirCompleted,
        pending: dirPending,
        overdue: dirOverdue,
        confirmed: confirmedTasks,
        completionRate
      };
    });
    
    // Calcular promedio de cumplimiento
    const avgRate = directorMetrics.length > 0
      ? Math.round(directorMetrics.reduce((sum, d) => sum + d.completionRate, 0) / directorMetrics.length)
      : 0;
    
    setDirectors(directorMetrics);
    setMetrics({
      totalTasks: areaTasks.length,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
      avgCompletionRate: avgRate
    });
  }, [userArea, tasks, directors]);

  // Cargar directores del área
  useEffect(() => {
    loadDirectors();
  }, [loadDirectors]);

  // Calcular métricas cuando cambian las tareas o directores
  useEffect(() => {
    if (directors.length > 0 && tasks.length > 0) {
      calculateMetrics();
    }
  }, [directors, tasks, calculateMetrics]);

  // Ordenar directores
  const sortedDirectors = [...directors].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = (a.displayName || '').localeCompare(b.displayName || '');
        break;
      case 'completed':
        comparison = (b.completed || 0) - (a.completed || 0);
        break;
      case 'pending':
        comparison = (b.pending || 0) - (a.pending || 0);
        break;
      case 'rate':
        comparison = (b.completionRate || 0) - (a.completionRate || 0);
        break;
      case 'overdue':
        comparison = (b.overdue || 0) - (a.overdue || 0);
        break;
      default:
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getRateColor = (rate) => {
    if (rate >= 80) return theme.success;
    if (rate >= 50) return theme.warning;
    return theme.error;
  };

  const getRateIcon = (rate) => {
    if (rate >= 80) return 'checkmark-circle';
    if (rate >= 50) return 'alert-circle';
    return 'close-circle';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.80)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando métricas del área...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.80)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      {showHeader && (
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderBottomWidth: 1, borderBottomColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics" size={24} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Métricas de mi Área
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {directors.length} directores
          </Text>
        </View>
      )}

      {/* Resumen General */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <Ionicons name="document-text" size={24} color={theme.secondary} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{metrics.totalTasks}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Tareas</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <Ionicons name="checkmark-done" size={24} color={theme.success} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{metrics.completedTasks}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Completadas</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <Ionicons name="time" size={24} color={theme.warning} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{metrics.pendingTasks}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Pendientes</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <Ionicons name="alert" size={24} color={theme.error} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>{metrics.overdueTasks}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Vencidas</Text>
        </View>
      </View>

      {/* Promedio de cumplimiento */}
      <View style={[styles.avgCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <View style={styles.avgContent}>
          <Ionicons 
            name={getRateIcon(metrics.avgCompletionRate)} 
            size={32} 
            color={getRateColor(metrics.avgCompletionRate)} 
          />
          <View style={styles.avgTextContainer}>
            <Text style={[styles.avgLabel, { color: theme.textSecondary }]}>
              Cumplimiento Promedio del Área
            </Text>
            <Text style={[styles.avgValue, { color: getRateColor(metrics.avgCompletionRate) }]}>
              {metrics.avgCompletionRate}%
            </Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${metrics.avgCompletionRate}%`,
                backgroundColor: getRateColor(metrics.avgCompletionRate)
              }
            ]} 
          />
        </View>
      </View>

      {/* Filtros de ordenamiento - SOLO VISIBLE PARA SECRETARIOS Y ADMIN */}
      {(currentUserRole === 'secretario' || currentUserRole === 'admin') && (
      <View style={styles.filtersRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Rendimiento por Director</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {[
            { key: 'name', label: 'Nombre' },
            { key: 'rate', label: 'Cumplimiento' },
            { key: 'completed', label: 'Completadas' },
            { key: 'overdue', label: 'Vencidas' }
          ].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: sortBy === filter.key 
                    ? theme.primary
                    : theme.border
                }
              ]}
              onPress={() => toggleSort(filter.key)}
            >
              <Text style={[
                styles.filterText,
                { color: sortBy === filter.key ? '#FFFFFF' : theme.text }
              ]}>
                {filter.label}
              </Text>
              {sortBy === filter.key && (
                <Ionicons 
                  name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                  size={14} 
                  color="#FFFFFF" 
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      )}

      {/* Lista de directores - SOLO VISIBLE PARA SECRETARIOS Y ADMIN */}
      {(currentUserRole === 'secretario' || currentUserRole === 'admin') && (
      <ScrollView style={styles.directorsList} showsVerticalScrollIndicator={false}>
        {sortedDirectors.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
            <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No hay directores en esta área
            </Text>
          </View>
        ) : (
          sortedDirectors.map((director, index) => (
            <View 
              key={director.id || index} 
              style={[styles.directorCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}
            >
              <View style={styles.directorHeader}>
                <View style={styles.directorInfo}>
                  <View style={[
                    styles.avatar, 
                    { backgroundColor: getRateColor(director.completionRate || 0) + '20' }
                  ]}>
                    <Text style={[
                      styles.avatarText, 
                      { color: getRateColor(director.completionRate || 0) }
                    ]}>
                      {(director.displayName || 'D').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.directorText}>
                    <Text style={[styles.directorName, { color: theme.text }]} numberOfLines={1}>
                      {director.displayName || 'Director'}
                    </Text>
                    <Text style={[styles.directorCargo, { color: theme.textSecondary }]} numberOfLines={1}>
                      {director.cargo || 'Sin cargo'}
                    </Text>
                  </View>
                </View>
                <View style={styles.rateContainer}>
                  <Ionicons 
                    name={getRateIcon(director.completionRate || 0)} 
                    size={20} 
                    color={getRateColor(director.completionRate || 0)} 
                  />
                  <Text style={[styles.rateText, { color: getRateColor(director.completionRate || 0) }]}>
                    {director.completionRate || 0}%
                  </Text>
                </View>
              </View>
              
              {/* Barra de progreso del director */}
              <View style={[styles.directorProgress, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${director.completionRate || 0}%`,
                      backgroundColor: getRateColor(director.completionRate || 0)
                    }
                  ]} 
                />
              </View>
              
              {/* Métricas del director */}
              <View style={styles.directorMetrics}>
                <View style={styles.metricItem}>
                  <Ionicons name="layers-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.metricValue, { color: theme.text }]}>{director.totalTasks || 0}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Total</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="checkmark-done-outline" size={14} color={theme.success} />
                  <Text style={[styles.metricValue, { color: theme.success }]}>{director.completed || 0}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Compl.</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="time-outline" size={14} color={theme.warning} />
                  <Text style={[styles.metricValue, { color: theme.warning }]}>{director.pending || 0}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Pend.</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="alert-outline" size={14} color={theme.error} />
                  <Text style={[styles.metricValue, { color: theme.error }]}>{director.overdue || 0}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Venc.</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={theme.secondary} />
                  <Text style={[styles.metricValue, { color: theme.secondary }]}>{director.confirmed || 0}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Conf.</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  loadingText: {
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 80,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  avgCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  avgContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  avgTextContainer: {
    flex: 1,
  },
  avgLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  avgValue: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  filtersRow: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    gap: 4,
  },
  filterText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
  },
  directorsList: {
    flex: 1,
  },
  emptyState: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  directorCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  directorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  directorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  directorText: {
    flex: 1,
  },
  directorName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  directorCargo: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  directorProgress: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  directorMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});

export default AreaMetricsPanel;
