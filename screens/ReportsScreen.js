// screens/ReportsScreen.js
// Pantalla de reportes: resumen por periodo, métricas por área, alertas, análisis y
// exportación. Los datos se calculan en reports/useReportsData.js y cada sección
// vive en su propio archivo de la carpeta reports/.
import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useTasks } from '../contexts/TasksContext';
import ShimmerEffect from '../components/ShimmerEffect';
import ScreenHeader from '../components/ui/ScreenHeader';
import AreaFilter from './reports/AreaFilter';
import AlertsPanel from './reports/AlertsPanel';
import InsightsPanel from './reports/InsightsPanel';
import AreaMetricsPanel from './reports/AreaMetricsPanel';
import { exportAreaReport } from '../services/ReportsExport';
import { MAX_WIDTHS } from '../theme/tokens';
import { createStyles } from './reports/ReportsScreenStyles';
import { filterMetricsByAreas } from './reports/reportStats';
import { useReportsData } from './reports/useReportsData';
import { useReportsAnimations } from './reports/useReportsAnimations';
import { PeriodTabs, KeyStats, NoAreaData } from './reports/PeriodSummary';
import HierarchySummary from './reports/HierarchySummary';
import AreaSections from './reports/AreaSections';
import ChartsModal, { priorityChartData } from './reports/ChartsModal';
import { syncPendingOperations } from '../services/offlineSync';

const ComplianceReport = React.lazy(() => import('./reports/ComplianceReport'));
// Pestañas que antes eran pantallas aparte
const AdminReportsScreen = React.lazy(() => import('./AdminReportsScreen'));
const MyAreaReportsScreen = React.lazy(() => import('./MyAreaReportsScreen'));
const AnalyticsScreen = React.lazy(() => import('./AnalyticsScreen'));

// Las predicciones aún no se calculan; InsightsPanel las recibe vacías
const NO_PREDICTIONS = {};

const tabStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '600' },
});

export default function ReportsScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError } = useNotification();
  const { tasks, isLoading: tasksLoading, currentUser } = useTasks();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  const [selectedArea, setSelectedArea] = useState(null);
  const [filteredAreas, setFilteredAreas] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [showChartsModal, setShowChartsModal] = useState(false);
  // 'indicadores' | 'enviados' | 'analiticas'. Otra pantalla puede abrir una pestaña con { tab }
  const requestedTab = route?.params?.tab;
  const [tab, setTab] = useState(requestedTab || 'indicadores');
  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  const {
    statsByPeriod, dailyCompletions, priorityDistribution,
    detailedAreaMetrics, areaMetrics, areasNeedingAttention, metricsByType,
    subtasksStats, tasksWithProgress,
    alerts, suggestions, monthlyComparative, bottlenecks, workloadDistribution,
  } = useReportsData(tasks, currentUser);

  const anim = useReportsAnimations(!loading, metricsByType);

  useEffect(() => {
    if (!tasksLoading) setLoading(false);
  }, [tasksLoading]);

  // Métricas de las áreas elegidas en el filtro
  const displayed = useMemo(
    () => filterMetricsByAreas({ detailedAreaMetrics, areaMetrics, areasNeedingAttention }, filteredAreas),
    [filteredAreas, detailedAreaMetrics, areaMetrics, areasNeedingAttention]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Los datos llegan en tiempo real; el gesto envía lo que quedó pendiente sin conexión
    syncPendingOperations().catch(() => {}).finally(() => setRefreshing(false));
  };

  const handleExportReport = useCallback(async () => {
    const notify = (ok, webText, title, text) => {
      if (Platform.OS === 'web') (ok ? showSuccess : showError)(webText);
      else Alert.alert(title, text);
    };
    setExporting(true);
    try {
      const result = await exportAreaReport(areaMetrics, tasks, period);
      if (result.success) {
        notify(true, `Reporte descargado: ${result.filename}`, 'Reporte guardado', result.filename);
      } else {
        notify(false, result.error || 'No se pudo exportar el reporte', 'No se pudo exportar', result.error || 'Intenta de nuevo.');
      }
    } catch {
      notify(false, 'No se pudo exportar el reporte', 'No se pudo exportar', 'Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [areaMetrics, tasks, period, showError, showSuccess]);

  const currentStats = statsByPeriod[period];
  const priorityData = useMemo(
    () => priorityChartData(priorityDistribution, theme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorityDistribution, theme.text]
  );

  const isDesktopLarge = width >= 1440;
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding), [theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Reportes" subtitle="Cargando…" icon="bar-chart" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} scrollEnabled={false}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <ShimmerEffect key={i} width={(width - 52) / 3} height={80} borderRadius={12} />
            ))}
          </View>
          <ShimmerEffect width="100%" height={140} borderRadius={14} />
          <ShimmerEffect width="100%" height={200} borderRadius={14} />
          {[...Array(4)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={60} borderRadius={12} />
          ))}
        </ScrollView>
      </View>
    );
  }

  const role = currentUser?.role;
  // Todo lo de reportes vive aquí, en pestañas según el rol
  const tabs = [
    { key: 'indicadores', label: 'Indicadores', icon: 'bar-chart-outline' },
    { key: 'enviados', label: role === 'admin' ? 'Reportes de las áreas' : 'Reportes de mi área', icon: 'document-text-outline' },
    role === 'admin' && { key: 'analiticas', label: 'Analíticas', icon: 'analytics-outline' },
  ].filter(Boolean);
  const activeTab = tabs.some((item) => item.key === tab) ? tab : 'indicadores';
  const tabFallback = <ShimmerEffect width="100%" height={240} borderRadius={12} style={{ margin: 16 }} />;
  const hasAreaData = Object.keys(areaMetrics).length > 0;
  const hasCharts = subtasksStats.completed > 0 || subtasksStats.pending > 0
    || dailyCompletions.length > 0 || priorityData.length > 0;
  const glassCard = {
    backgroundColor: theme.glass,
    borderColor: theme.glassBorder,
  };
  const areasToReview = displayed.areasNeedingAttention.length;

  return (
    <View style={[styles.container, Platform.OS === 'web' && { minHeight: '100vh' }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }, Platform.OS === 'web' && { width: '100%', paddingHorizontal: padding }]}>
        <Animated.View style={anim.header}>
          <ScreenHeader
            title="Reportes"
            subtitle={[
              `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}`,
              currentStats.overdue > 0 && `${currentStats.overdue} ${currentStats.overdue === 1 ? 'vencida' : 'vencidas'}`,
            ].filter(Boolean).join(' · ')}
            icon="bar-chart"
          />
        </Animated.View>

        <View style={tabStyles.row} accessibilityRole="tablist">
          {tabs.map((item) => {
            const selected = item.key === activeTab;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[
                  tabStyles.tab,
                  { backgroundColor: selected ? theme.primary : theme.glass, borderColor: selected ? theme.primary : theme.glassBorder },
                ]}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons name={item.icon} size={16} color={selected ? '#FFFFFF' : theme.textSecondary} />
                <Text style={[tabStyles.label, { color: selected ? '#FFFFFF' : theme.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'enviados' && (
          <Suspense fallback={tabFallback}>
            {role === 'admin'
              ? <AdminReportsScreen navigation={navigation} embedded />
              : <MyAreaReportsScreen navigation={navigation} embedded />}
          </Suspense>
        )}
        {activeTab === 'analiticas' && (
          <Suspense fallback={tabFallback}>
            <AnalyticsScreen navigation={navigation} embedded />
          </Suspense>
        )}

        {activeTab === 'indicadores' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <PeriodTabs period={period} onChange={setPeriod} styles={styles} theme={theme} isDark={isDark} />

          <Animated.View style={[{ marginBottom: 20 }, anim.filter]}>
            <AreaFilter
              areas={hasAreaData ? Object.keys(areaMetrics) : ['Sin datos']}
              selectedAreas={filteredAreas}
              onSelectionChange={setFilteredAreas}
              maxVisible={4}
            />
          </Animated.View>

          {(alerts.length > 0 || suggestions.length > 0) && (
            <Animated.View style={anim.filter}>
              <AlertsPanel
                alerts={alerts}
                suggestions={suggestions}
                onAlertPress={() => {}}
                onDismiss={() => {}}
              />
            </Animated.View>
          )}

          {!hasAreaData && (
            <Animated.View style={anim.empty}>
              <NoAreaData taskCount={tasks.length} styles={styles} theme={theme} isDark={isDark} />
            </Animated.View>
          )}

          <Animated.View style={anim.stats}>
            <KeyStats stats={currentStats} styles={styles} theme={theme} isDark={isDark} />
          </Animated.View>

          {hasAreaData && (monthlyComparative || bottlenecks.length > 0) && (
            <Animated.View style={anim.charts}>
              <InsightsPanel
                monthlyComparative={monthlyComparative}
                bottlenecks={bottlenecks}
                predictions={NO_PREDICTIONS}
                workloadDistribution={workloadDistribution}
              />
            </Animated.View>
          )}

          {/* Reporte de cumplimiento — solo admin */}
          {role === 'admin' && tasks.length > 0 && (
            <Animated.View style={anim.charts}>
              <Suspense fallback={<ShimmerEffect width="100%" height={200} borderRadius={8} />}>
                <ComplianceReport tasks={tasks} showDetails={true} />
              </Suspense>
            </Animated.View>
          )}

          {/* Métricas de su área — secretarios y directores */}
          {(role === 'secretario' || role === 'director') && tasks.length > 0 && (
            <Animated.View style={anim.charts}>
              <AreaMetricsPanel
                userArea={currentUser?.area || currentUser?.department}
                tasks={tasks}
                showHeader={true}
                currentUserRole={role}
              />
            </Animated.View>
          )}

          {(role === 'admin' || role === 'secretario' || role === 'director') && hasAreaData && (
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.primary }]}
              onPress={handleExportReport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" size={18} />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>Exportar Reporte</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {hasCharts && (
            <TouchableOpacity
              style={[styles.chartsButton, glassCard]}
              onPress={() => setShowChartsModal(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: theme.primary + '15', padding: 8, borderRadius: 10 }}>
                  <Ionicons name="bar-chart" size={18} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                    Gráficas detalladas
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Subtareas{subtasksStats.completed > 0 ? ` · ${subtasksStats.completionRate}% completadas` : ''}{dailyCompletions.length > 0 ? ' · Historial por día' : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {areasToReview > 0 && (
            <View style={[styles.alertSection, { marginBottom: 16 }]}>
              <View style={[styles.alertHeader, { backgroundColor: theme.errorAlpha, borderColor: theme.error + '40', borderWidth: 1, borderRadius: 16, padding: 12 }]}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: theme.error }]}>
                    {areasToReview} área{areasToReview > 1 ? 's' : ''} requiere atención
                  </Text>
                  <Text style={[styles.alertSubtitle, { color: theme.textSecondary }]}>
                    Menos del 60% de tareas completadas
                  </Text>
                </View>
              </View>
            </View>
          )}

          <HierarchySummary
            metricsByType={metricsByType}
            filteredAreas={filteredAreas}
            onFilterAreas={setFilteredAreas}
            anim={anim}
            styles={styles}
            theme={theme}
            isDark={isDark}
          />

          <AreaSections
            detailedMetrics={displayed.detailedAreaMetrics}
            areaMetrics={displayed.areaMetrics}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            anim={anim}
            styles={styles}
            theme={theme}
            isDark={isDark}
            padding={padding}
            isDesktop={isDesktop}
          />
        </ScrollView>
        )}
      </View>

      <ChartsModal
        visible={showChartsModal}
        onClose={() => setShowChartsModal(false)}
        subtasksStats={subtasksStats}
        tasksWithProgress={tasksWithProgress}
        dailyCompletions={dailyCompletions}
        priorityData={priorityData}
        chartWidth={width - (padding * 2 + 64)}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}
