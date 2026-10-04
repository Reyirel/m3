// screens/reports/AreaSections.js
// Secciones del reporte por área: estadísticas, comparación, ranking, detalle del área
// elegida y vista rápida de rendimiento.
import React, { Suspense } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShimmerEffect from '../../components/ShimmerEffect';
import SpringCard from '../../components/SpringCard';
import AreaStatsCard from '../../components/AreaStatsCard';
import AreaRankingCard from '../../components/AreaRankingCard';

const AreaComparisonChart = React.lazy(() => import('../../components/AreaComparisonChart'));

// Lo que se muestra en el lugar de una sección mientras no hay áreas con datos
function EmptySection({ icon, title, subtitle, anim, styles, theme }) {
  return (
    <Animated.View style={anim.charts}>
      <SpringCard style={styles.emptyCardContainer}>
        <View style={styles.emptyCardContent}>
          <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={icon} size={48} color={theme.primary} />
          </View>
          <Text style={[styles.emptyCardTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </SpringCard>
    </Animated.View>
  );
}

function SectionHeader({ icon, title, styles, theme }) {
  return (
    <View style={styles.chartHeader}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.chartTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

function SelectedAreaCard({ area, metrics, userCount, onClose, styles, theme }) {
  const blocks = [
    { label: 'Completadas', value: metrics.completed, color: theme.success },
    { label: 'Total', value: metrics.total, color: theme.text },
    { label: 'Atrasadas', value: metrics.overdue || 0, color: theme.error },
    ...(userCount > 0 ? [{ label: 'Usuarios', value: userCount, color: theme.text }] : []),
  ];
  return (
    <SpringCard style={[styles.chartCard, { borderWidth: 2, borderColor: theme.primary }]}>
      <View style={styles.selectedAreaHeader}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>{area}</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.selectedAreaStats}>
        {blocks.map((block) => (
          <View key={block.label} style={styles.statBlock}>
            <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>{block.label}</Text>
            <Text style={[styles.statBlockValue, { color: block.color }]}>{block.value}</Text>
          </View>
        ))}
      </View>
    </SpringCard>
  );
}

function QuickMetricCard({ area, metrics, onPress, styles, theme, isDark }) {
  const rate = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;
  const statusColor = rate >= 75 ? theme.success : rate >= 50 ? theme.warning : theme.error;
  const statusBg = rate >= 75 ? theme.successAlpha : rate >= 50 ? theme.warningAlpha : theme.errorAlpha;
  const statusIcon = rate >= 75 ? 'checkmark-circle' : rate >= 50 ? 'time' : 'alert-circle';

  return (
    <TouchableOpacity
      style={[styles.quickMetricCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickMetricStatusBadge, { backgroundColor: statusBg }]}>
        <Ionicons name={statusIcon} size={14} color={statusColor} />
      </View>

      <Text style={[styles.quickMetricAreaName, { color: theme.text }]} numberOfLines={2}>
        {area.replace('Secretaría de ', '').replace('Dirección de ', '')}
      </Text>

      <View style={styles.quickMetricProgressContainer}>
        <View style={[styles.quickMetricProgressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.quickMetricProgressBar, { width: `${rate}%`, backgroundColor: statusColor }]} />
        </View>
      </View>

      <View style={styles.quickMetricStatsRow}>
        <View style={styles.quickMetricStatItem}>
          <Text style={[styles.quickMetricStatValue, { color: statusColor }]}>{Math.round(rate)}%</Text>
        </View>
        <View style={[styles.quickMetricStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.quickMetricStatItem}>
          <Text style={[styles.quickMetricStatLabel, { color: theme.textSecondary }]}>
            {metrics.completed}/{metrics.total}
          </Text>
        </View>
      </View>

      {metrics.overdue > 0 && (
        <View style={styles.quickMetricOverdueTag}>
          <Ionicons name="warning" size={10} color={theme.error} />
          <Text style={styles.quickMetricOverdueText}>
            {metrics.overdue} vencida{metrics.overdue > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * @param {Object} detailedMetrics - Métricas completas por área (ya filtradas)
 * @param {Object} areaMetrics - Métricas reducidas por área (ya filtradas)
 * @param {string|null} selectedArea - Área de la que se muestra el detalle
 */
export default function AreaSections({
  detailedMetrics, areaMetrics, selectedArea, onSelectArea, anim, styles, theme, isDark, padding, isDesktop,
}) {
  const hasDetailed = Object.keys(detailedMetrics).length > 0;
  const areaCount = Object.keys(areaMetrics).length;
  const shared = { anim, styles, theme };

  return (
    <>
      {hasDetailed ? (
        <SpringCard style={styles.chartCard}>
          <SectionHeader icon="stats-chart" title="Estadísticas por Área" styles={styles} theme={theme} />
          <View style={styles.areaCardsContainer}>
            {Object.entries(detailedMetrics)
              .sort((a, b) => b[1].completionRate - a[1].completionRate)
              .map(([area, metrics], index) => (
                <AreaStatsCard
                  key={area}
                  areaName={area}
                  completed={metrics.completed}
                  total={metrics.total}
                  assignedUsers={metrics.userCount || 0}
                  avgCompletionTime={metrics.avgCompletionTime || 0}
                  overdueTasks={metrics.overdue || 0}
                  trend={metrics.trendDirection || 'stable'}
                  trendValue={metrics.trend || 0}
                  index={index}
                  onPress={() => onSelectArea(area)}
                />
              ))}
          </View>
        </SpringCard>
      ) : (
        <EmptySection icon="bar-chart-outline" title="Estadísticas Detalladas" subtitle="Aquí verás métricas de cada área" {...shared} />
      )}

      {areaCount > 0 ? (
        <SpringCard style={styles.chartCard}>
          <SectionHeader icon="arrow-forward-outline" title="Comparación de Rendimiento" styles={styles} theme={theme} />
          <Suspense fallback={<ShimmerEffect width="100%" height={200} borderRadius={8} />}>
            <AreaComparisonChart
              areaMetrics={areaMetrics}
              padding={padding}
              isDesktop={isDesktop}
              onAreaSelect={onSelectArea}
            />
          </Suspense>
        </SpringCard>
      ) : (
        <EmptySection icon="trending-up-outline" title="Comparación de Rendimiento" subtitle="Visualiza el desempeño entre áreas" {...shared} />
      )}

      {hasDetailed ? (
        <SpringCard style={styles.chartCard}>
          <SectionHeader icon="podium-outline" title="Ranking de Áreas" styles={styles} theme={theme} />
          <AreaRankingCard
            areaMetrics={detailedMetrics}
            taskCountByArea={areaMetrics}
            overdueByArea={Object.fromEntries(
              Object.entries(detailedMetrics).map(([area, metrics]) => [area, metrics.overdue || 0])
            )}
            onAreaPress={onSelectArea}
          />
        </SpringCard>
      ) : (
        <EmptySection icon="medal-outline" title="Ranking de Áreas" subtitle="Posiciones según desempeño" {...shared} />
      )}

      {selectedArea && areaMetrics[selectedArea] && (
        <SelectedAreaCard
          area={selectedArea}
          metrics={areaMetrics[selectedArea]}
          userCount={detailedMetrics[selectedArea]?.userCount}
          onClose={() => onSelectArea(null)}
          styles={styles}
          theme={theme}
        />
      )}

      {areaCount > 0 && (
        <SpringCard style={styles.chartCard}>
          <View style={styles.quickMetricsHeader}>
            <View style={[styles.quickMetricsIconBg, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="speedometer" size={22} color={theme.primary} />
            </View>
            <View style={styles.quickMetricsTitleContainer}>
              <Text style={[styles.quickMetricsTitle, { color: theme.text }]}>Rendimiento por Área</Text>
              <Text style={[styles.quickMetricsSubtitle, { color: theme.textSecondary }]}>
                {areaCount} áreas monitoreadas
              </Text>
            </View>
          </View>

          <View style={styles.quickMetricsGrid}>
            {Object.entries(areaMetrics).map(([area, metrics]) => (
              <QuickMetricCard
                key={area}
                area={area}
                metrics={metrics}
                onPress={() => onSelectArea(area)}
                styles={styles}
                theme={theme}
                isDark={isDark}
              />
            ))}
          </View>
        </SpringCard>
      )}
    </>
  );
}
