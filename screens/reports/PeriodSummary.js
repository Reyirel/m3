// screens/reports/PeriodSummary.js
// Parte superior del reporte: selector de periodo, resumen del periodo elegido y el
// aviso que aparece cuando todavía no hay áreas con tareas.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SpringCard from '../../components/SpringCard';

const PERIODS = [
  { key: 'week', label: '7D', fullLabel: 'Semana' },
  { key: 'month', label: '30D', fullLabel: 'Mes' },
  { key: 'quarter', label: '90D', fullLabel: 'Trimestre' },
];

const glassCard = (theme, isDark) => ({
  backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
  borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
});

export function PeriodTabs({ period, onChange, styles, theme, isDark }) {
  return (
    <View style={[styles.periodCard, glassCard(theme, isDark)]}>
      <View style={styles.periodTabs}>
        {PERIODS.map((option) => {
          const active = period === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onChange(option.key)}
              style={[
                styles.periodTab,
                active && styles.periodTabActive,
                { backgroundColor: active ? theme.primary : 'transparent' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodTabLabel, { color: active ? '#FFFFFF' : theme.textSecondary }]}>
                {option.label}
              </Text>
              <Text style={[styles.periodTabFullLabel, { color: active ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                {option.fullLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function KeyStats({ stats, styles, theme, isDark }) {
  const goodRate = stats.completionRate >= 50;
  const metrics = [
    { label: 'Completadas', value: stats.completed, accent: theme.success, bg: theme.successAlpha },
    { label: 'En progreso', value: stats.inProgress, accent: theme.info, bg: theme.infoAlpha },
    { label: 'Pendientes', value: stats.pending, accent: theme.warning, bg: theme.warningAlpha },
    { label: 'Vencidas', value: stats.overdue, accent: theme.error, bg: stats.overdue > 0 ? theme.errorAlpha : glassCard(theme, isDark).backgroundColor },
  ];

  return (
    <>
      <View style={[styles.summaryCard, glassCard(theme, isDark)]}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryLeft}>
            <View style={[styles.summaryIconBg, { backgroundColor: theme.primary }]}>
              <Ionicons name="pie-chart" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tasa de Finalización</Text>
              <View style={styles.summaryValueRow}>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.completionRate}</Text>
                <Text style={[styles.summaryPercent, { color: theme.primary }]}>%</Text>
              </View>
            </View>
          </View>
          <View style={[styles.summaryTrend, { backgroundColor: goodRate ? theme.successAlpha : theme.errorAlpha }]}>
            <Ionicons
              name={goodRate ? 'trending-up' : 'trending-down'}
              size={18}
              color={goodRate ? theme.success : theme.error}
            />
          </View>
        </View>

        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={[styles.progressBarFill, { width: `${stats.completionRate}%` }]} />
        </View>
      </View>

      <View style={styles.metricsRow}>
        {metrics.map(({ label, value, accent, bg }) => (
          <View key={label} style={[styles.metricItem, { backgroundColor: bg, borderColor: accent + '40' }]}>
            <View style={[styles.metricAccentBar, { backgroundColor: accent }]} />
            <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={[styles.metricNumber, { color: accent }]}>{value}</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

export function NoAreaData({ taskCount, styles, theme, isDark }) {
  return (
    <SpringCard style={{
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.10)' : 'rgba(99, 102, 241, 0.08)',
      borderLeftWidth: 0,
      overflow: 'hidden',
      paddingVertical: 24,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <View style={[styles.emptyStateIcon, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="bar-chart-outline" size={32} color={theme.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>Sin Datos de Áreas</Text>
          <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary, marginBottom: 12 }]}>
            Las áreas aparecerán aquí cuando crees tareas
          </Text>

          <View style={styles.emptyStatsRow}>
            <View style={styles.emptyStat}>
              <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Tareas</Text>
              <Text style={[styles.emptyStatValue, { color: theme.text }]}>{taskCount}</Text>
            </View>
            <View style={styles.emptyStatDivider} />
            <View style={styles.emptyStat}>
              <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Áreas</Text>
              <Text style={[styles.emptyStatValue, { color: theme.text }]}>0</Text>
            </View>
          </View>

          <View style={[styles.emptyHelpBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
            <Ionicons name="information-circle" size={16} color={theme.primary} />
            <Text style={[styles.emptyHelpText, { color: theme.primary }]}>
              Asigna una área a tus tareas para ver estadísticas
            </Text>
          </View>
        </View>
      </View>
    </SpringCard>
  );
}
