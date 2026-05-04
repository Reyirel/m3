import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { GlassmorphicSummaryCard, GlassmorphicTabs, GlassmorphicEmptyState } from '../components';
import ScreenHeader from '../components/ui/ScreenHeader';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { tasks: contextTasks } = useTasks();
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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    // ✨ Header Premium
    headerGradient: {
      paddingTop: 48,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
      letterSpacing: 0.2,
    },
    headerDecoration: {
      position: 'absolute',
      right: 20,
      top: 50,
      opacity: 0.08,
    },
    content: {
      flex: 1,
    },
    // ✨ Secciones
    section: {
      marginHorizontal: 16,
      marginVertical: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    // ✨ Métricas Grid Premium
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCardWrapper: {
      width: (width - 44) / 2,
    },
    metricCardGradient: {
      borderRadius: 20,
      padding: 18,
      minHeight: 140,
      position: 'relative',
      overflow: 'hidden',
    },
    metricGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
    metricIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    metricLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
      marginBottom: 6,
    },
    metricValue: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    metricSubvalue: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 4,
      fontWeight: '500',
    },
    metricShine: {
      position: 'absolute',
      top: -50,
      right: -50,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    // ✨ Rating Distribution Premium
    ratingContainer: {
      borderRadius: 20,
      padding: 20,
      overflow: 'hidden',
    },
    ratingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    ratingIconBg: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    ratingTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    ratingSubtext: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
    },
    ratingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 12,
    },
    ratingStarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 45,
      gap: 4,
    },
    ratingStarNum: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    ratingBarBackground: {
      flex: 1,
      height: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 6,
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 6,
    },
    ratingCount: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      minWidth: 30,
      textAlign: 'right',
    },
    // ✨ Task Status Premium
    statusContainer: {
      borderRadius: 20,
      padding: 20,
      overflow: 'hidden',
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    statusIconBg: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    statusTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    statusSubtext: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
    },
    statusItem: {
      marginBottom: 18,
    },
    statusItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    statusItemLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    statusValue: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statusBarBg: {
      height: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 7,
      overflow: 'hidden',
    },
    statusBarFill: {
      height: '100%',
      borderRadius: 7,
    },
    // ✨ Top Tasks Premium
    topTasksContainer: {
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
    },
    topTasksHeader: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    topTasksHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    topTasksIconBg: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    topTasksTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    topTasksSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    topTaskItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      flexDirection: 'row',
      alignItems: 'center',
    },
    topTaskRank: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    topTaskRankText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    topTaskInfo: {
      flex: 1,
    },
    topTaskTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    topTaskMeta: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    topTaskRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    topTaskRatingText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.accentLight,
    },
    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 300,
    },
  }), [isDark]);

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
        Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(headerSlide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      // Overview
      Animated.parallel([
        Animated.spring(overviewAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(overviewSlide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      // Ratings
      Animated.parallel([
        Animated.spring(ratingsAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(ratingsSlide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      // Status
      Animated.parallel([
        Animated.spring(statusAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(statusSlide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      // Top Tasks
      Animated.parallel([
        Animated.spring(topTasksAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(topTasksSlide, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
    ]).start();
    
  };
  
  // Función para animar escala de tarjeta
  const animateCardPress = (index, pressed) => {
    Animated.spring(cardScales[index], {
      toValue: pressed ? 0.96 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };
  
  // Función para refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const stats = await getReportStatistics();
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
        const stats = await getReportStatistics();
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
          style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}
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
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
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

      {/* ✨ Glassmorphic Header */}
      <Animated.View style={{
        opacity: headerAnim,
        transform: [{ translateY: headerSlide }]
      }}>
        <ScreenHeader
          title="Analytics"
          subtitle="Insights y métricas de rendimiento"
          icon="analytics"
          onBack={() => navigation.goBack()}
        />
      </Animated.View>

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
                  activeOpacity={0.85}
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
