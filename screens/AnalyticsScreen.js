import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import ShimmerEffect from '../components/ShimmerEffect';
import { getReportStatistics } from '../services/reportsService';
import { getOverallTaskMetrics } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { GlassmorphicTabs } from '../components';
import ScreenHeader, { useHeaderPaddingTop } from '../components/ui/ScreenHeader';
import { spring } from '../theme/motion';
import { createStyles } from './reports/AnalyticsScreenStyles';

const { width } = Dimensions.get('window');

// `embedded`: se muestra como pestaña dentro de Reportes, sin encabezado propio
const AnalyticsScreen = ({ navigation, embedded = false }) => {
  const { theme, isDark } = useTheme();
  const headerPaddingTop = useHeaderPaddingTop();
  const { tasks: contextTasks, currentUser } = useTasks();
  // Las estadísticas de reportes cuentan solo los que este usuario puede ver
  const reportScope = { user: currentUser, tasks: contextTasks };
  // Top 5 tasks by quality rating — derived from role-filtered context tasks
  const tasks = useMemo(() =>
    contextTasks
      .filter(t => t.qualityRating)
      .sort((a, b) => (b.qualityRating || 0) - (a.qualityRating || 0))
      .slice(0, 5),
    [contextTasks]
  );
  const [reportStats, setReportStats] = useState(null);
  const [taskMetrics, setTaskMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✨ Animaciones premium
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const overviewAnim = useRef(new Animated.Value(0)).current;
  const overviewSlide = useRef(new Animated.Value(40)).current;
  const ratingsAnim = useRef(new Animated.Value(0)).current;
  const ratingsSlide = useRef(new Animated.Value(40)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;
  const statusSlide = useRef(new Animated.Value(40)).current;
  const topTasksAnim = useRef(new Animated.Value(0)).current;
  const topTasksSlide = useRef(new Animated.Value(40)).current;
  
  // Animaciones de escala para tarjetas
  const [cardScales] = useState([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]);

  const styles = useMemo(() => createStyles(isDark, theme), [isDark, theme]);

  // ✨ Función para ejecutar animaciones de entrada
  const runEntranceAnimations = () => {
    // Reset animaciones
    headerAnim.setValue(0);
    headerSlide.setValue(-30);
    overviewAnim.setValue(0);
    overviewSlide.setValue(40);
    ratingsAnim.setValue(0);
    ratingsSlide.setValue(40);
    statusAnim.setValue(0);
    statusSlide.setValue(40);
    topTasksAnim.setValue(0);
    topTasksSlide.setValue(40);
    // Animación secuencial
    Animated.stagger(100, [
      // Header
      Animated.parallel([
        spring(headerAnim, 1),
        spring(headerSlide, 0),
      ]),
      // Overview
      Animated.parallel([
        spring(overviewAnim, 1),
        spring(overviewSlide, 0),
      ]),
      // Ratings
      Animated.parallel([
        spring(ratingsAnim, 1),
        spring(ratingsSlide, 0),
      ]),
      // Status
      Animated.parallel([
        spring(statusAnim, 1),
        spring(statusSlide, 0),
      ]),
      // Top Tasks
      Animated.parallel([
        spring(topTasksAnim, 1),
        spring(topTasksSlide, 0),
      ]),
    ]).start();
    
  };
  
  // Función para animar escala de tarjeta
  const animateCardPress = (index, pressed) => {
    spring(cardScales[index], pressed ? 0.96 : 1).start();
  };
  
  // Función para refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const stats = await getReportStatistics(null, reportScope);
      setReportStats(stats);
      const metrics = await getOverallTaskMetrics();
      setTaskMetrics(metrics);
      runEntranceAnimations();
    } catch (error) {
      if (__DEV__) console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        // Load report statistics
        const stats = await getReportStatistics(null, reportScope);
        if (!mounted) return;
        setReportStats(stats);

        // Load task metrics
        const metrics = await getOverallTaskMetrics();
        if (!mounted) return;
        setTaskMetrics(metrics);

        if (!mounted) return;
        setLoading(false);

        // ✨ Ejecutar animaciones de entrada
        setTimeout(() => runEntranceAnimations(), 100);
      } catch (error) {
        if (__DEV__) console.error('Error loading analytics:', error);
        if (mounted) { setLoading(false); setLoadError(true); }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const getRatingDistribution = () => {
    if (!reportStats || !reportStats.reports) return {};
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reportStats.reports.forEach((report) => {
      if (report.rating) {
        distribution[report.rating]++;
      }
    });
    return distribution;
  };

  const ratingDist = getRatingDistribution();
  const totalRated = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header shimmer */}
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: headerPaddingTop, paddingBottom: 20, paddingHorizontal: 20 }}
        >
          <ShimmerEffect width={160} height={24} borderRadius={8} style={{ marginBottom: 8 }} />
          <ShimmerEffect width={220} height={14} borderRadius={6} />
        </LinearGradient>
        {/* Metrics skeleton */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} scrollEnabled={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[...Array(3)].map((_, i) => (
              <ShimmerEffect key={i} width={(width - 56) / 3} height={90} borderRadius={14} />
            ))}
          </View>
          <ShimmerEffect width="100%" height={120} borderRadius={14} />
          <ShimmerEffect width="100%" height={180} borderRadius={14} />
          {[...Array(4)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={56} borderRadius={12} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 }]}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.errorAlpha, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="bar-chart-outline" size={48} color={theme.error} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' }}>Error al cargar analytics</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>No se pudieron cargar las métricas. Verifica tu conexión.</Text>
        <TouchableOpacity
          onPress={() => { setLoadError(false); setLoading(true); setRetryCount(c => c + 1); }}
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          accessibilityLabel="Reintentar" accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Configuración de gradientes para las cards
  const metricConfigs = [
    {
      gradient: [theme.success, theme.success],
      icon: 'document-text',
      label: 'Total Reportes',
      value: reportStats?.totalReports || 0,
      subvalue: `${reportStats?.withImages || 0} con imágenes`
    },
    {
      gradient: [theme.error, theme.error],
      icon: 'star',
      label: 'Calificación Prom.',
      value: reportStats?.avgRating?.toFixed(1) || 'N/A',
      subvalue: `de ${reportStats?.ratedReports || 0} reportes`
    },
    {
      gradient: [theme.info, theme.info],
      icon: 'checkmark-circle',
      label: 'Total Tareas',
      value: taskMetrics?.total || 0,
      subvalue: `${taskMetrics?.completed || 0} completadas`
    },
    {
      gradient: [theme.warning, theme.warning],
      icon: 'trending-up',
      label: 'Completado',
      value: `${taskMetrics?.completionPercentage?.toFixed(0) || 0}%`,
      subvalue: 'Progreso general'
    },
  ];

  return (
    <View style={styles.container}>

      {!embedded && (
        <Animated.View style={{
          opacity: headerAnim,
          transform: [{ translateY: headerSlide }]
        }}>
          <ScreenHeader
            title="Analíticas"
            subtitle="Indicadores de rendimiento"
            icon="analytics"
            onBack={() => navigation.goBack()}
          />
        </Animated.View>
      )}

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* ✨ Time Range Filter Tabs */}
        <Animated.View style={[styles.section, {
          opacity: overviewAnim,
          transform: [{ translateY: overviewSlide }]
        }]}>
          <GlassmorphicTabs
            tabs={[
              { id: 'week', label: 'Esta semana', icon: 'calendar-outline' },
              { id: 'month', label: 'Este mes', icon: 'calendar' },
              { id: 'quarter', label: 'Trimestre', icon: 'analytics' },
              { id: 'year', label: 'Año', icon: 'stats-chart' },
            ]}
            activeTab="month"
            onChange={() => {}}
          />
        </Animated.View>

        {/* ✨ Overview Metrics Premium */}
        <Animated.View style={[styles.section, {
          opacity: overviewAnim,
          transform: [{ translateY: overviewSlide }]
        }]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.sectionIconContainer}
            >
              <Ionicons name="grid" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={styles.sectionTitle}>Resumen General</Text>
              <Text style={styles.sectionSubtitle}>Métricas principales del sistema</Text>
            </View>
          </View>
          
          <View style={styles.metricsGrid}>
            {metricConfigs.map((config, index) => (
              <Animated.View 
                key={index} 
                style={[styles.metricCardWrapper, { transform: [{ scale: cardScales[index] }] }]}
              >
                <TouchableOpacity
                  onPressIn={() => animateCardPress(index, true)}
                  onPressOut={() => animateCardPress(index, false)}
                  activeOpacity={0.7}
                >
                <View style={[styles.metricCardGradient, { padding: 16, borderRadius: 16, backgroundColor: isDark ? theme.card : theme.glassStrong, borderWidth: 1, borderColor: theme.glassBorder }]}>
                  <View style={styles.metricIconWrapper}>
                    <Ionicons name={config.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.metricLabel}>{config.label}</Text>
                  <Text style={styles.metricValue}>{config.value}</Text>
                  <Text style={styles.metricSubvalue}>{config.subvalue}</Text>
                </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ✨ Rating Distribution Premium */}
        {totalRated > 0 && (
          <Animated.View style={[styles.section, {
            opacity: ratingsAnim,
            transform: [{ translateY: ratingsSlide }]
          }]}>
            <LinearGradient
              colors={isDark ? ['#7C3AED', '#5B21B6'] : ['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ratingContainer}
            >
              <View style={styles.ratingHeader}>
                <View style={styles.ratingIconBg}>
                  <Ionicons name="star" size={24} color={theme.warning} />
                </View>
                <View>
                  <Text style={styles.ratingTitleText}>Distribución de Calificaciones</Text>
                  <Text style={styles.ratingSubtext}>{totalRated} reportes calificados</Text>
                </View>
              </View>
              
              {[5, 4, 3, 2, 1].map((rating) => (
                <View key={rating} style={styles.ratingBar}>
                  <View style={styles.ratingStarContainer}>
                    <Text style={styles.ratingStarNum}>{rating}</Text>
                    <Ionicons name="star" size={14} color={theme.warning} />
                  </View>
                  <View style={styles.ratingBarBackground}>
                    <Animated.View
                      style={[
                        styles.ratingBarFill,
                        { width: `${totalRated > 0 ? (ratingDist[rating] / totalRated) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingCount}>{ratingDist[rating]}</Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        )}

        {/* ✨ Task Status Premium */}
        {taskMetrics && (
          <Animated.View style={[styles.section, {
            opacity: statusAnim,
            transform: [{ translateY: statusSlide }]
          }]}>
            <LinearGradient
              colors={isDark ? ['#0F766E', '#065F46'] : ['#14B8A6', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statusContainer}
            >
              <View style={styles.statusHeader}>
                <View style={styles.statusIconBg}>
                  <Ionicons name="pie-chart" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.statusTitleText}>Estado de Tareas</Text>
                  <Text style={styles.statusSubtext}>{taskMetrics.total || 0} tareas en total</Text>
                </View>
              </View>
              
              {/* Completadas */}
              <View style={styles.statusItem}>
                <View style={styles.statusItemHeader}>
                  <View style={styles.statusItemLabel}>
                    <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                    <Text style={styles.statusText}>Completadas</Text>
                  </View>
                  <Text style={styles.statusValue}>{taskMetrics.completed || 0}</Text>
                </View>
                <View style={styles.statusBarBg}>
                  <View style={[styles.statusBarFill, { backgroundColor: theme.success, width: `${Math.round(((taskMetrics.completed || 0) / (taskMetrics.total || 1)) * 100)}%` }]} />
                </View>
              </View>

              {/* En Progreso */}
              <View style={styles.statusItem}>
                <View style={styles.statusItemHeader}>
                  <View style={styles.statusItemLabel}>
                    <View style={[styles.statusDot, { backgroundColor: theme.warning }]} />
                    <Text style={styles.statusText}>En Progreso</Text>
                  </View>
                  <Text style={styles.statusValue}>{taskMetrics.inProgress || 0}</Text>
                </View>
                <View style={styles.statusBarBg}>
                  <View style={[styles.statusBarFill, { backgroundColor: theme.warning, width: `${Math.round(((taskMetrics.inProgress || 0) / (taskMetrics.total || 1)) * 100)}%` }]} />
                </View>
              </View>

              {/* Pendientes */}
              <View style={[styles.statusItem, { marginBottom: 0 }]}>
                <View style={styles.statusItemHeader}>
                  <View style={styles.statusItemLabel}>
                    <View style={[styles.statusDot, { backgroundColor: theme.secondary }]} />
                    <Text style={styles.statusText}>Pendientes</Text>
                  </View>
                  <Text style={styles.statusValue}>{taskMetrics.pending || 0}</Text>
                </View>
                <View style={styles.statusBarBg}>
                  <View style={[styles.statusBarFill, { backgroundColor: theme.secondary, width: `${Math.round(((taskMetrics.pending || 0) / (taskMetrics.total || 1)) * 100)}%` }]} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ✨ Top Rated Tasks Premium */}
        {tasks.length > 0 && (
          <Animated.View style={[styles.section, {
            opacity: topTasksAnim,
            transform: [{ translateY: topTasksSlide }]
          }]}>
            <View style={styles.topTasksContainer}>
              <View style={styles.topTasksHeader}>
                <View style={styles.topTasksHeaderContent}>
                  <LinearGradient
                    colors={[theme.warning, theme.warning]}
                    style={styles.topTasksIconBg}
                  >
                    <Ionicons name="trophy" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.topTasksTitle}>Tareas Mejor Calificadas</Text>
                    <Text style={styles.topTasksSubtitle}>Top 5 por rating de calidad</Text>
                  </View>
                </View>
              </View>
              
              {tasks.map((task, idx) => {
                const rankColors = [
                  [theme.warning, theme.warning],   // Gold
                  [theme.textSecondary, theme.textMuted], // Silver
                  [theme.error, theme.error],        // Bronze-ish
                  [theme.primary, theme.primary],    // Primary
                  [theme.primary, theme.primary],    // Primary
                ];
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    activeOpacity={0.7}
                    style={[
                      styles.topTaskItem,
                      idx === tasks.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <LinearGradient
                      colors={rankColors[idx] || rankColors[4]}
                      style={styles.topTaskRank}
                    >
                      <Text style={styles.topTaskRankText}>{idx + 1}</Text>
                    </LinearGradient>
                    
                    <View style={styles.topTaskInfo}>
                      <Text style={styles.topTaskTitle} numberOfLines={1}>
                        {task.titulo}
                      </Text>
                      <Text style={styles.topTaskMeta}>
                        {task.area} • {task.prioridad}
                      </Text>
                    </View>
                    
                    <View style={styles.topTaskRating}>
                      <Ionicons name="star" size={14} color={theme.warning} />
                      <Text style={styles.topTaskRatingText}>
                        {task.qualityRating}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default AnalyticsScreen;
