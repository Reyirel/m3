// components/ComplianceReport.js
// Reporte de cumplimiento individual por usuario/área
// Muestra quién trabaja y quién no en base a confirmaciones

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getComplianceMetrics } from '../services/taskConfirmations';
import { useTheme } from '../contexts/ThemeContext';

const ComplianceReport = ({ 
  tasks = [],
  onUserPress = null,
  showDetails = true 
}) => {
  const { theme } = useTheme();
  const [expandedUser, setExpandedUser] = useState(null);
  const [sortBy, setSortBy] = useState('complianceRate'); // 'complianceRate', 'assigned', 'pending'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = peor primero para identificar quién no trabaja

  // Calcular métricas de cumplimiento
  const metrics = useMemo(() => {
    const raw = getComplianceMetrics(tasks);
    return Object.values(raw);
  }, [tasks]);

  // Ordenar métricas
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [metrics, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Estadísticas generales
  const totalAssigned = metrics.reduce((sum, m) => sum + m.assigned, 0);
  const totalConfirmed = metrics.reduce((sum, m) => sum + m.confirmed, 0);
  const totalPending = metrics.reduce((sum, m) => sum + m.pending, 0);
  const avgComplianceRate = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.complianceRate, 0) / metrics.length)
    : 0;

  const getComplianceColor = (rate) => {
    if (rate >= 80) return theme.success;
    if (rate >= 50) return theme.warning;
    return theme.error;
  };

  const getComplianceLabel = (rate) => {
    if (rate >= 80) return 'Excelente';
    if (rate >= 50) return 'Regular';
    return 'Bajo';
  };

  if (metrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={48} color={theme.textMuted} />
        <Text style={styles.emptyText}>No hay datos de cumplimiento</Text>
        <Text style={styles.emptySubtext}>Las métricas aparecerán cuando haya tareas con confirmaciones</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con resumen */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart" size={22} color={theme.secondary} />
          <Text style={styles.title}>Reporte de Cumplimiento</Text>
        </View>
        <Text style={styles.subtitle}>Quién trabaja y quién no</Text>
      </View>

      {/* Resumen general */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalAssigned}</Text>
          <Text style={styles.summaryLabel}>Asignadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: theme.success }]}>{totalConfirmed}</Text>
          <Text style={styles.summaryLabel}>Confirmadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: theme.error }]}>{totalPending}</Text>
          <Text style={styles.summaryLabel}>Pendientes</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: getComplianceColor(avgComplianceRate) + '15' }]}>
          <Text style={[styles.summaryValue, { color: getComplianceColor(avgComplianceRate) }]}>
            {avgComplianceRate}%
          </Text>
          <Text style={styles.summaryLabel}>Promedio</Text>
        </View>
      </View>

      {/* Controles de ordenamiento */}
      <View style={styles.sortControls}>
        <Text style={styles.sortLabel}>Ordenar por:</Text>
        <TouchableOpacity 
          style={[styles.sortBtn, sortBy === 'complianceRate' && styles.sortBtnActive]}
          onPress={() => toggleSort('complianceRate')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'complianceRate' && styles.sortBtnTextActive]}>
            Cumplimiento {sortBy === 'complianceRate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortBtn, sortBy === 'pending' && styles.sortBtnActive]}
          onPress={() => toggleSort('pending')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'pending' && styles.sortBtnTextActive]}>
            Pendientes {sortBy === 'pending' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de usuarios */}
      <View style={styles.usersList}>
        {sortedMetrics.map((user, index) => (
          <TouchableOpacity
            key={user.email}
            style={[
              styles.userCard,
              user.complianceRate < 50 && styles.userCardWarning
            ]}
            onPress={() => {
              setExpandedUser(expandedUser === user.email ? null : user.email);
              onUserPress?.(user);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.userMainRow}>
              {/* Posición/Ranking */}
              <View style={[
                styles.rankBadge,
                { backgroundColor: index < 3
                  ? (index === 0 ? theme.error : index === 1 ? theme.warning : theme.textMuted)
                  : theme.border
                }
              ]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              {/* Info usuario */}
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              {/* Métricas */}
              <View style={styles.userMetrics}>
                <View style={[
                  styles.complianceBadge,
                  { backgroundColor: getComplianceColor(user.complianceRate) }
                ]}>
                  <Text style={styles.complianceText}>{user.complianceRate}%</Text>
                </View>
                <Text style={styles.complianceLabel}>
                  {getComplianceLabel(user.complianceRate)}
                </Text>
              </View>
            </View>

            {/* Barra de progreso */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${user.complianceRate}%`,
                      backgroundColor: getComplianceColor(user.complianceRate)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {user.confirmed}/{user.assigned} tareas
              </Text>
            </View>

            {/* Detalles expandidos */}
            {showDetails && expandedUser === user.email && (
              <View style={styles.expandedDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                    <Text style={styles.detailText}>{user.confirmed} confirmadas</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={16} color={theme.warning} />
                    <Text style={styles.detailText}>{user.pending} pendientes</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="flash" size={16} color={theme.info} />
                    <Text style={styles.detailText}>{user.onTime} a tiempo</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="warning" size={16} color={theme.error} />
                    <Text style={styles.detailText}>{user.late} tarde</Text>
                  </View>
                </View>
                {user.onTimeRate > 0 && (
                  <View style={styles.onTimeRate}>
                    <Text style={styles.onTimeRateText}>
                      Puntualidad: {user.onTimeRate}%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Leyenda */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Leyenda de colores:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.error }]} />
            <Text style={styles.legendText}>{'< 50%'} - Necesita atención</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
            <Text style={styles.legendText}>50-79% - Regular</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
            <Text style={styles.legendText}>≥ 80% - Excelente</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  sortBtnActive: {
    backgroundColor: '#6366F1',
  },
  sortBtnText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  usersList: {
    gap: 10,
  },
  userCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  userMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
  userMetrics: {
    alignItems: 'flex-end',
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complianceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  complianceLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    minWidth: 70,
    textAlign: 'right',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#4B5563',
  },
  onTimeRate: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  onTimeRateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ComplianceReport;
