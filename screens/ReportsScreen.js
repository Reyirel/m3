// screens/ReportsScreen.js
// Pantalla de reportes con gráficos de progreso semanal/mensual
// ✨ Integración: Alertas, Insights, Exportación, Optimizaciones
import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Modal,
} from 'react-native';
const LineChart = React.lazy(() => import('react-native-chart-kit').then(module => ({ default: module.LineChart })));
const PieChart = React.lazy(() => import('react-native-chart-kit').then(module => ({ default: module.PieChart })));
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useTasks } from '../contexts/TasksContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ShimmerEffect from '../components/ShimmerEffect';
import SpringCard from '../components/SpringCard';
import AreaStatsCard from '../components/AreaStatsCard';
const AreaComparisonChart = React.lazy(() => import('../components/AreaComparisonChart'));
import AreaRankingCard from '../components/AreaRankingCard';
import AreaFilter from '../components/AreaFilter';
import AlertsPanel from '../components/AlertsPanel';
import InsightsPanel from '../components/InsightsPanel';
const ComplianceReport = React.lazy(() => import('../components/ComplianceReport'));
import AreaMetricsPanel from '../components/AreaMetricsPanel';
import { calculateDetailedAreaMetrics, generateAreaSummary, getAreasNeedingAttention } from '../services/areaMetrics';
import { getAreaAlerts } from '../services/AreaAlerts';
import { 
  calculateMonthlyComparative, 
  identifyBottlenecks, 
  generateOptimizationSuggestions,
  analyzeWorkloadDistribution,
  getCachedAnalytics 
} from '../services/AreaAnalytics';
import { exportAreaReport } from '../services/ReportsExport';
import { subscribeToAreas } from '../services/area/areaManagement';
import { getAreaType } from '../config/areas';
import { MAX_WIDTHS } from '../theme/tokens';
import { toMs } from '../utils/dateUtils';
import { isInProgress } from '../utils/taskStatus';


export default function ReportsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError } = useNotification();
  const { tasks, isLoading: tasksLoading, currentUser } = useTasks();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  
  // Stats
  const [weeklyStats, setWeeklyStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    avgCompletionTime: 0
  });

  const [monthlyStats, setMonthlyStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    avgCompletionTime: 0
  });

  const [quarterlyStats, setQuarterlyStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    avgCompletionTime: 0
  });

  const [dailyCompletions, setDailyCompletions] = useState([]);
  const [priorityDistribution, setPriorityDistribution] = useState({});
  const [areaMetrics, setAreaMetrics] = useState({});
  const [detailedAreaMetrics, setDetailedAreaMetrics] = useState({});
  const [, setAreaSummary] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [areasNeedingAttention, setAreasNeedingAttention] = useState([]);
  const [filteredAreas, setFilteredAreas] = useState([]);
  
  // Estados para jerarquía de áreas
  const [firestoreAreas, setFirestoreAreas] = useState([]);
  const [metricsByType, setMetricsByType] = useState({
    secretaria: { total: 0, completed: 0, pending: 0, overdue: 0, avgRate: 0, areas: [] },
    direccion: { total: 0, completed: 0, pending: 0, overdue: 0, avgRate: 0, areas: [] }
  });
  
  // Subtasks stats
  const [subtasksStats, setSubtasksStats] = useState({
    completed: 0,
    pending: 0,
    completionRate: 0
  });
  
  const [tasksWithProgress, setTasksWithProgress] = useState([]);

  // ✨ NUEVOS ESTADOS: Alertas, Analytics e Insights
  const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [monthlyComparative, setMonthlyComparative] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [workloadDistribution, setWorkloadDistribution] = useState({});
  const [predictions] = useState({});
  const [exporting, setExporting] = useState(false);
  const [showChartsModal, setShowChartsModal] = useState(false);
  
  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(20)).current;
  const chartsOpacity = useRef(new Animated.Value(0)).current;
  const chartsSlide = useRef(new Animated.Value(20)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const filterSlide = useRef(new Animated.Value(20)).current;
  const emptyStateAnim = useRef(new Animated.Value(0)).current;
  const emptyStateSlide = useRef(new Animated.Value(20)).current;
  
  // ✨ Nuevas animaciones premium
  const hierarchyAnim = useRef(new Animated.Value(0)).current;
  const hierarchySlide = useRef(new Animated.Value(40)).current;
  const secretariaScale = useRef(new Animated.Value(0.9)).current;
  const direccionScale = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ⚠️ En web, useNativeDriver puede causar problemas
  const useNativeDriver = Platform.OS !== 'web';


  // Load subtasks for progress tracking — lectura puntual (no live updates para reportes)
  useEffect(() => {
    let mounted = true;

    if (tasks.length === 0) {
      setTasksWithProgress([]);
      setSubtasksStats({ completed: 0, pending: 0, completionRate: 0 });
      return;
    }

    const tasksToLoad = tasks.slice(0, 20);

    const loadSubtasksStats = async () => {
      try {
        // Lecturas paralelas — evita 20 subscripciones activas
        const results = await Promise.all(
          tasksToLoad.map(async (task) => {
            try {
              const subtasksRef = collection(db, 'tasks', task.id, 'subtasks');
              const snapshot = await getDocs(query(subtasksRef, orderBy('createdAt', 'asc')));
              const subtasks = snapshot.docs.map(d => d.data());
              const completed = subtasks.filter(s => s.status === 'completada').length;
              return { task, completed, total: subtasks.length };
            } catch {
              return { task, completed: 0, total: 0 };
            }
          })
        );

        if (!mounted) return;

        let totalCompleted = 0;
        let totalAll = 0;
        const withProgress = [];

        results.forEach(({ task, completed, total }) => {
          totalCompleted += completed;
          totalAll += total;
          if (total > 0) {
            withProgress.push({
              id: task.id,
              title: task.title,
              subtasksCompleted: completed,
              subtasksTotal: total,
              progress: Math.round((completed / total) * 100),
              status: task.status,
            });
          }
        });

        setTasksWithProgress(withProgress.sort((a, b) => b.progress - a.progress).slice(0, 10));
        setSubtasksStats({
          completed: totalCompleted,
          pending: totalAll - totalCompleted,
          completionRate: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
        });
      } catch (error) {
        if (__DEV__) console.warn('Error loading subtasks stats:', error?.message);
      }
    };

    loadSubtasksStats();

    return () => { mounted = false; };
  }, [tasks]);

  // Sync loading state from context
  useEffect(() => {
    if (!tasksLoading) {
      setLoading(false);
    }
  }, [tasksLoading]);

  // Recalcular estadísticas cuando cambian las tareas O el usuario
  useEffect(() => {
    if (tasks.length > 0 && currentUser) {
      calculateStats(tasks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, currentUser]);

  // Suscribirse a áreas de Firestore para la estructura jerárquica
  useEffect(() => {
    let unsubscribe = null;
    
    try {
      unsubscribe = subscribeToAreas((areas) => {
        setFirestoreAreas(areas);
      });
    } catch (error) {
      if (__DEV__) console.warn('Error subscribing to areas:', error);
    }
    
    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          if (__DEV__) console.warn('Error unsubscribing from areas:', error);
        }
      }
    };
  }, []);

  // Animations — espera a que termine la transición de navegación
  useEffect(() => {
    if (!loading) {
      headerOpacity.setValue(0);
      headerSlide.setValue(-30);
      filterAnim.setValue(0);
      filterSlide.setValue(20);
      statsOpacity.setValue(0);
      statsSlide.setValue(20);
      emptyStateAnim.setValue(0);
      emptyStateSlide.setValue(20);
      chartsOpacity.setValue(0);
      chartsSlide.setValue(20);

      const startAnimations = () => {
        Animated.stagger(60, [
          Animated.parallel([
            Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver }),
            Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver }),
          ]),
          Animated.parallel([
            Animated.timing(filterAnim, { toValue: 1, duration: 300, useNativeDriver }),
            Animated.timing(filterSlide, { toValue: 0, duration: 300, useNativeDriver }),
          ]),
          Animated.parallel([
            Animated.timing(statsOpacity, { toValue: 1, duration: 300, useNativeDriver }),
            Animated.timing(statsSlide, { toValue: 0, duration: 300, useNativeDriver }),
          ]),
          Animated.parallel([
            Animated.timing(emptyStateAnim, { toValue: 1, duration: 300, useNativeDriver }),
            Animated.timing(emptyStateSlide, { toValue: 0, duration: 300, useNativeDriver }),
          ]),
          Animated.parallel([
            Animated.timing(chartsOpacity, { toValue: 1, duration: 300, useNativeDriver }),
            Animated.timing(chartsSlide, { toValue: 0, duration: 300, useNativeDriver }),
          ]),
        ]).start();
      };

      if (Platform.OS !== 'web') {
        const interaction = InteractionManager.runAfterInteractions(startAnimations);
        return () => interaction.cancel();
      } else {
        startAnimations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filterAnim, filterSlide, statsOpacity, statsSlide, emptyStateAnim, emptyStateSlide, chartsOpacity, chartsSlide, headerOpacity, headerSlide]);

  // ✨ Animaciones para sección jerárquica cuando hay datos
  useEffect(() => {
    if (metricsByType.secretaria.total > 0 || metricsByType.direccion.total > 0) {
      // Reset
      hierarchyAnim.setValue(0);
      hierarchySlide.setValue(40);
      secretariaScale.setValue(0.9);
      direccionScale.setValue(0.9);
      // Animación de entrada
      Animated.sequence([
        Animated.delay(50),
        Animated.parallel([
          Animated.timing(hierarchyAnim, { toValue: 1, duration: 500, useNativeDriver }),
          Animated.spring(hierarchySlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver }),
        ]),
        // Animación de tarjetas con escala
        Animated.stagger(60, [
          Animated.spring(secretariaScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver }),
          Animated.spring(direccionScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver }),
        ]),
      ]).start();
      
      // OPTIMIZACIÓN: Pulso simple una vez en lugar de loop infinito
      // para evitar consumo constante de CPU
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 600, useNativeDriver }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsByType, hierarchyAnim, hierarchySlide, secretariaScale, direccionScale, pulseAnim]);

  const calculateStats = (allTasks) => {
    // Esperar a que currentUser esté disponible
    if (!currentUser) {
      return;
    }
    
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Mostrar tareas según el rol del usuario
    let userTasks;
    if (currentUser.role === 'admin') {
      // Admin ve todas las tareas
      userTasks = allTasks;
    } else {
      // Secretario y director: allTasks ya viene filtrado por email desde useTasks()
      userTasks = allTasks;
    }

    // Weekly stats
    const weeklyTasks = userTasks.filter(t => toMs(t.createdAt) >= weekAgo);
    const weeklyCompleted = weeklyTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    setWeeklyStats({
      completed: weeklyCompleted.length,
      inProgress: weeklyTasks.filter(t => isInProgress(t.status) || t.status === 'en_revision').length,
      pending: weeklyTasks.filter(t => t.status === 'pendiente').length,
      overdue: weeklyTasks.filter(t => toMs(t.dueAt) < now && t.status !== 'cerrada').length,
      completionRate: weeklyTasks.length > 0 ? Math.round((weeklyCompleted.length / weeklyTasks.length) * 100) : 0,
      avgCompletionTime: calculateAverageCompletionTime(weeklyCompleted)
    });

    // Monthly stats
    const monthlyTasks = userTasks.filter(t => toMs(t.createdAt) >= monthAgo);
    const monthlyCompleted = monthlyTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    setMonthlyStats({
      completed: monthlyCompleted.length,
      inProgress: monthlyTasks.filter(t => t.status === 'en-progreso' || t.status === 'en_proceso' || t.status === 'en_revision').length,
      pending: monthlyTasks.filter(t => t.status === 'pendiente').length,
      overdue: monthlyTasks.filter(t => toMs(t.dueAt) < now && t.status !== 'cerrada').length,
      completionRate: monthlyTasks.length > 0 ? Math.round((monthlyCompleted.length / monthlyTasks.length) * 100) : 0,
      avgCompletionTime: calculateAverageCompletionTime(monthlyCompleted)
    });

    // Quarterly stats (90 days)
    const quarterAgo = now - 90 * 24 * 60 * 60 * 1000;
    const quarterlyTasks = userTasks.filter(t => toMs(t.createdAt) >= quarterAgo);
    const quarterlyCompleted = quarterlyTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    setQuarterlyStats({
      completed: quarterlyCompleted.length,
      inProgress: quarterlyTasks.filter(t => t.status === 'en-progreso' || t.status === 'en_proceso' || t.status === 'en_revision').length,
      pending: quarterlyTasks.filter(t => t.status === 'pendiente').length,
      overdue: quarterlyTasks.filter(t => toMs(t.dueAt) < now && t.status !== 'cerrada').length,
      completionRate: quarterlyTasks.length > 0 ? Math.round((quarterlyCompleted.length / quarterlyTasks.length) * 100) : 0,
      avgCompletionTime: calculateAverageCompletionTime(quarterlyCompleted)
    });

    // Daily completions (últimos 7 días)
    calculateDailyCompletions(weeklyCompleted);

    // Priority distribution
    const byPriority = {
      alta: userTasks.filter(t => t.priority === 'alta').length,
      media: userTasks.filter(t => t.priority === 'media').length,
      baja: userTasks.filter(t => t.priority === 'baja').length,
    };
    setPriorityDistribution(byPriority);

    // Area metrics (if applicable)
    calculateAreaMetrics(userTasks);
  };

  const calculateDailyCompletions = (completedTasks) => {
    const dailyMap = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
    }

    // Count completions by day
    completedTasks.forEach(task => {
      const completedDate = task.completedAt 
        ? new Date(toMs(task.completedAt))
        : new Date(toMs(task.updatedAt));
      
      const dateStr = completedDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      if (dateStr in dailyMap) {
        dailyMap[dateStr]++;
      }
    });

    setDailyCompletions(Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count
    })));
  };

  const calculateAreaMetrics = (allTasks) => {
    // Usar el servicio mejorado para calcular métricas detalladas
    const detailedMetrics = calculateDetailedAreaMetrics(allTasks, []);
    setDetailedAreaMetrics(detailedMetrics);

    // Convertir a formato simple para compatibilidad
    const byArea = {};
    Object.entries(detailedMetrics).forEach(([area, metrics]) => {
      byArea[area] = { 
        completed: metrics.completed, 
        total: metrics.total,
        overdue: metrics.overdue,
        userCount: metrics.userCount,
        avgCompletionTime: metrics.avgCompletionTime,
        completionRate: metrics.completionRate || 0,
      };
    });
    setAreaMetrics(byArea);

    // Generar resumen
    const summary = generateAreaSummary(detailedMetrics, allTasks);
    setAreaSummary(summary);

    // Identificar áreas que necesitan atención
    const needingAttention = getAreasNeedingAttention(detailedMetrics, 60);
    setAreasNeedingAttention(needingAttention);

    // ✨ Calcular métricas agrupadas por tipo (Secretaría vs Dirección)
    calculateMetricsByType(detailedMetrics);
  };

  // Nueva función para calcular métricas por tipo de área
  const calculateMetricsByType = (detailedMetrics) => {
    const byType = {
      secretaria: { total: 0, completed: 0, pending: 0, overdue: 0, avgRate: 0, areas: [] },
      direccion: { total: 0, completed: 0, pending: 0, overdue: 0, avgRate: 0, areas: [] }
    };

    let secretariaRates = [];
    let direccionRates = [];

    Object.entries(detailedMetrics).forEach(([areaName, metrics]) => {
      // Determinar el tipo de área usando la configuración o Firestore
      const firestoreArea = firestoreAreas.find(a => a.nombre === areaName);
      let tipo = firestoreArea ? firestoreArea.tipo : getAreaType(areaName);
      if (tipo === 'unknown') {
        tipo = areaName.toLowerCase().includes('secretaría') ? 'secretaria' : 'direccion';
      }

      // Agregar a la categoría correspondiente
      byType[tipo].total += metrics.total || 0;
      byType[tipo].completed += metrics.completed || 0;
      byType[tipo].pending += metrics.pending || 0;
      byType[tipo].overdue += metrics.overdue || 0;
      byType[tipo].areas.push({
        name: areaName,
        ...metrics
      });

      // Guardar rates para promediar
      if (tipo === 'secretaria') {
        secretariaRates.push(metrics.completionRate || 0);
      } else {
        direccionRates.push(metrics.completionRate || 0);
      }
    });

    // Calcular promedios
    byType.secretaria.avgRate = secretariaRates.length > 0
      ? Math.round(secretariaRates.reduce((a, b) => a + b, 0) / secretariaRates.length)
      : 0;
    byType.direccion.avgRate = direccionRates.length > 0
      ? Math.round(direccionRates.reduce((a, b) => a + b, 0) / direccionRates.length)
      : 0;

    setMetricsByType(byType);
  };

  // Función auxiliar para filtrar métricas por áreas seleccionadas (memoizada)
  const filteredMetricsData = useMemo(() => {
    if (filteredAreas.length === 0) {
      return { detailedAreaMetrics, areaMetrics, areasNeedingAttention };
    }

    const filtered = {};
    const filteredDetailed = {};
    const filteredAlerts = [];

    filteredAreas.forEach((area) => {
      if (detailedAreaMetrics[area]) {
        filteredDetailed[area] = detailedAreaMetrics[area];
      }
      if (areaMetrics[area]) {
        filtered[area] = areaMetrics[area];
      }
    });

    areasNeedingAttention.forEach((item) => {
      if (filteredAreas.includes(item.name)) {
        filteredAlerts.push(item);
      }
    });

    return {
      detailedAreaMetrics: filteredDetailed,
      areaMetrics: filtered,
      areasNeedingAttention: filteredAlerts,
    };
  }, [filteredAreas, detailedAreaMetrics, areaMetrics, areasNeedingAttention]);

  const { detailedAreaMetrics: displayDetailedMetrics, areaMetrics: displayAreaMetrics, areasNeedingAttention: displayAlerts } = filteredMetricsData;

  // ✨ Calcular alertas, insights y análisis avanzados (optimizado con useMemo)
  useEffect(() => {
    if (tasks.length === 0 || !areaMetrics || Object.keys(areaMetrics).length === 0) {
      setAlerts([]);
      setSuggestions([]);
      return;
    }

    try {
      // Usar caché para no recalcular constantemente
      const newAlerts = getCachedAnalytics('alerts', () => 
        getAreaAlerts(areaMetrics)
      );
      setAlerts(newAlerts);

      // Calcular comparativas históricas (solo si hay tareas completadas)
      const comparatives = calculateMonthlyComparative(tasks);
      setMonthlyComparative(comparatives);

      // Identificar cuellos de botella
      const bottlenecksList = identifyBottlenecks(areaMetrics, tasks);
      setBottlenecks(bottlenecksList);

      // Analizar distribución de carga
      const distribution = analyzeWorkloadDistribution(areaMetrics, tasks);
      setWorkloadDistribution(distribution);

      // Generar sugerencias
      const optimizations = generateOptimizationSuggestions(areaMetrics, tasks, newAlerts);
      setSuggestions(optimizations);
    } catch (error) {
      if (__DEV__) console.error('Error calculando análisis avanzados:', error);
    }
  }, [areaMetrics, tasks]);

  const calculateAverageCompletionTime = (completedTasks) => {
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const created = toMs(task.createdAt);
      const completed = toMs(task.completedAt);
      return sum + (completed - created);
    }, 0);

    const avgMs = totalTime / completedTasks.length;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    return avgDays;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch data
    setTimeout(() => setRefreshing(false), 1500);
  };

  // ✨ Función para exportar reportes
  const handleExportReport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportAreaReport(areaMetrics, tasks, period);
      if (result.success) {
        if (Platform.OS === 'web') {
          showSuccess(`✅ Reporte Descargado: ${result.filename}`);
        } else {
          Alert.alert('✅ Éxito', `Reporte guardado: ${result.filename}`);
        }
      } else {
        if (Platform.OS === 'web') {
          showError(`❌ Error: ${result.error || 'No se pudo exportar'}`);
        } else {
          Alert.alert('❌ Error', result.error);
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        showError('❌ Error: No se pudo exportar el reporte');
      } else {
        Alert.alert('❌ Error', 'No se pudo exportar el reporte');
      }
    } finally {
      setExporting(false);
    }
  }, [areaMetrics, tasks, period, showError, showSuccess]);

  const currentStats = period === 'week' ? weeklyStats : period === 'month' ? monthlyStats : quarterlyStats;

  // OPTIMIZACIÓN: Memoizar datos de charts para evitar recreación
  const chartData = useMemo(() => ({
    labels: dailyCompletions.map(d => d.date),
    datasets: [{
      data: dailyCompletions.map(d => d.count),
      strokeWidth: 2,
      color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
    }],
  }), [dailyCompletions]);

  const priorityChartData = useMemo(() => [
    { name: 'Alta', population: priorityDistribution.alta || 0, color: theme.errorDark, legendFontColor: theme.text },
    { name: 'Media', population: priorityDistribution.media || 0, color: theme.warning, legendFontColor: theme.text },
    { name: 'Baja', population: priorityDistribution.baja || 0, color: theme.success, legendFontColor: theme.text },
  ].filter(d => d.population > 0), [priorityDistribution, theme.text]);

  const isDesktopLarge = width >= 1440;
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding), [theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={{ paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 }}
        >
          <ShimmerEffect width={160} height={24} borderRadius={8} style={{ marginBottom: 8 }} />
          <ShimmerEffect width={240} height={14} borderRadius={6} />
        </LinearGradient>
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

  return (
    <View style={[styles.container, Platform.OS === 'web' && { minHeight: '100vh' }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }, Platform.OS === 'web' && { width: '100%', paddingHorizontal: padding }]}>
        {/* Header Premium Compacto */}
        <Animated.View style={{ opacity: Platform.OS === 'web' ? 1 : headerOpacity, transform: Platform.OS === 'web' ? [] : [{ translateY: headerSlide }] }}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.8 }}
            style={styles.headerGradientInner}
          >
            <View style={styles.header}>
              <View style={styles.headerLeftSection}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Volver"
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.headerLabel}>REPORTES</Text>
                  <Text style={styles.heading}>Evolución</Text>
                </View>
              </View>
              
              <View style={styles.headerRightSection}>
                {currentStats.overdue > 0 && (
                  <View style={styles.headerAlertBadge}>
                    <Ionicons name="alert" size={14} color="#FFFFFF" />
                    <Text style={styles.headerAlertText}>{currentStats.overdue}</Text>
                  </View>
                )}
                <View style={styles.headerStatMini}>
                  <Text style={styles.headerStatMiniValue}>{tasks.length}</Text>
                  <Text style={styles.headerStatMiniLabel}>tareas</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector - Tabs Premium */}
          <View style={[styles.periodCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
            <View style={styles.periodTabs}>
              {[
                { key: 'week', label: '7D', fullLabel: 'Semana', icon: 'today-outline' },
                { key: 'month', label: '30D', fullLabel: 'Mes', icon: 'calendar-outline' },
                { key: 'quarter', label: '90D', fullLabel: 'Trimestre', icon: 'calendar' }
              ].map((p, _idx) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[
                    styles.periodTab,
                    period === p.key && styles.periodTabActive,
                    { backgroundColor: period === p.key ? theme.primary : 'transparent' }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.periodTabLabel,
                    { color: period === p.key ? '#FFFFFF' : theme.textSecondary }
                  ]}>{p.label}</Text>
                  <Text style={[
                    styles.periodTabFullLabel,
                    { color: period === p.key ? 'rgba(255,255,255,0.75)' : theme.textSecondary }
                  ]}>{p.fullLabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Area Filter */}
          <Animated.View style={{ 
            marginBottom: 20, 
            opacity: Platform.OS === 'web' ? 1 : filterAnim,
            transform: Platform.OS === 'web' ? [] : [{ translateY: filterSlide }]
          }}>
            <AreaFilter
              areas={Object.keys(areaMetrics).length > 0 ? Object.keys(areaMetrics) : ['Sin datos']}
              selectedAreas={filteredAreas}
              onSelectionChange={setFilteredAreas}
              maxVisible={4}
            />
          </Animated.View>

          {/* ✨ ALERTAS Y SUGERENCIAS */}
          {alerts.length > 0 || suggestions.length > 0 ? (
            <Animated.View style={{ 
              opacity: Platform.OS === 'web' ? 1 : filterAnim,
              transform: Platform.OS === 'web' ? [] : [{ translateY: filterSlide }]
            }}>
              <AlertsPanel
                alerts={alerts}
                suggestions={suggestions}
                onAlertPress={() => {}}
                onDismiss={() => {}}
              />
            </Animated.View>
          ) : null}

          {/* Debug: Data Status - Improved Design */}
          {Object.keys(areaMetrics).length === 0 && (
            <Animated.View style={{ 
              opacity: Platform.OS === 'web' ? 1 : emptyStateAnim,
              transform: Platform.OS === 'web' ? [] : [{ translateY: emptyStateSlide }]
            }}>
              <SpringCard style={{
                backgroundColor: isDark
                  ? 'rgba(79, 70, 229, 0.10)'
                  : 'rgba(99, 102, 241, 0.08)',
                borderLeftWidth: 0,
                overflow: 'hidden',
                paddingVertical: 24,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  {/* Icon */}
                  <View style={[styles.emptyStateIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="bar-chart-outline" size={32} color={theme.primary} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                      Sin Datos de Áreas
                    </Text>
                    <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary, marginBottom: 12 }]}>
                      Las áreas aparecerán aquí cuando crees tareas
                    </Text>
                    
                    {/* Stats Row */}
                    <View style={styles.emptyStatsRow}>
                      <View style={styles.emptyStat}>
                        <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Tareas</Text>
                        <Text style={[styles.emptyStatValue, { color: theme.text }]}>{tasks.length}</Text>
                      </View>
                      <View style={styles.emptyStatDivider} />
                      <View style={styles.emptyStat}>
                        <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Áreas</Text>
                        <Text style={[styles.emptyStatValue, { color: theme.text }]}>0</Text>
                      </View>
                    </View>

                    {/* Help Text */}
                    <View style={[styles.emptyHelpBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                      <Ionicons name="information-circle" size={16} color={theme.primary} />
                      <Text style={[styles.emptyHelpText, { color: theme.primary }]}>
                        Asigna una área a tus tareas para ver estadísticas
                      </Text>
                    </View>
                  </View>
                </View>
              </SpringCard>
            </Animated.View>
          )}

          {/* Key Stats - Dashboard Premium */}
          <Animated.View style={{ 
            opacity: Platform.OS === 'web' ? 1 : statsOpacity,
            transform: Platform.OS === 'web' ? [] : [{ translateY: statsSlide }]
          }}>
            {/* Tarjeta Principal de Resumen */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryLeft}>
                  <View style={[styles.summaryIconBg, { backgroundColor: theme.primary }]}>
                    <Ionicons name="pie-chart" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tasa de Finalización</Text>
                    <View style={styles.summaryValueRow}>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>{currentStats.completionRate}</Text>
                      <Text style={[styles.summaryPercent, { color: theme.primary }]}>%</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.summaryTrend, { backgroundColor: currentStats.completionRate >= 50 ? theme.successAlpha : theme.errorAlpha }]}>
                  <Ionicons
                    name={currentStats.completionRate >= 50 ? "trending-up" : "trending-down"}
                    size={18}
                    color={currentStats.completionRate >= 50 ? theme.success : theme.error}
                  />
                </View>
              </View>
              
              {/* Barra de Progreso */}
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.progressBarFill, { width: `${currentStats.completionRate}%` }]} />
              </View>
            </View>

            {/* Grid de Métricas */}
            <View style={styles.metricsRow}>
              {[
                { label: 'Completadas', value: currentStats.completed,  accent: theme.success, bg: theme.successAlpha },
                { label: 'En progreso', value: currentStats.inProgress, accent: theme.info,    bg: theme.infoAlpha    },
                { label: 'Pendientes',  value: currentStats.pending,    accent: theme.warning, bg: theme.warningAlpha },
                { label: 'Vencidas',    value: currentStats.overdue,    accent: theme.error,   bg: currentStats.overdue > 0 ? theme.errorAlpha : (isDark ? theme.glass : 'rgba(255,255,255,0.85)') },
              ].map(({ label, value, accent, bg }) => (
                <View
                  key={label}
                  style={[
                    styles.metricItem,
                    { backgroundColor: bg, borderColor: accent + '40' },
                  ]}
                >
                  <View style={[styles.metricAccentBar, { backgroundColor: accent }]} />
                  <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
                    <Text style={[styles.metricNumber, { color: accent }]}>{value}</Text>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ✨ INSIGHTS Y PREDICCIONES */}
          {Object.keys(areaMetrics).length > 0 && (monthlyComparative || bottlenecks.length > 0) && (
            <Animated.View style={{ 
              opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
              transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
            }}>
              <InsightsPanel
                monthlyComparative={monthlyComparative}
                bottlenecks={bottlenecks}
                predictions={predictions}
                workloadDistribution={workloadDistribution}
              />
            </Animated.View>
          )}

          {/* 📊 REPORTE DE CUMPLIMIENTO - Solo admin */}
          {currentUser?.role === 'admin' && tasks.length > 0 && (
            <Animated.View style={{ 
              opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
              transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
            }}>
              <Suspense fallback={<ShimmerEffect width="100%" height={200} borderRadius={8} />}>
                <ComplianceReport
                  tasks={tasks}
                  showDetails={true}
                />
              </Suspense>
            </Animated.View>
          )}

          {/* 📊 MÉTRICAS DE ÁREA - Solo secretarios y directores */}
          {(currentUser?.role === 'secretario' || currentUser?.role === 'director') && tasks.length > 0 && (
            <Animated.View style={{ 
              opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
              transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
            }}>
              <AreaMetricsPanel 
                userArea={currentUser?.area || currentUser?.department}
                tasks={tasks}
                showHeader={true}
                currentUserRole={currentUser?.role}
              />
            </Animated.View>
          )}

          {/* Botón de exportación */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'secretario' || currentUser?.role === 'director') && Object.keys(areaMetrics).length > 0 && (
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

          {/* Botón: ver detalle de subtareas y gráficas históricas */}
          {(subtasksStats.completed > 0 || subtasksStats.pending > 0 || dailyCompletions.length > 0 || priorityChartData.length > 0) && (
            <TouchableOpacity
              style={[styles.chartsButton, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}
              onPress={() => setShowChartsModal(true)}
              activeOpacity={0.8}
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

          {/* Áreas que requieren atención */}
          {displayAlerts.length > 0 && (
            <View style={[styles.alertSection, { marginBottom: 16 }]}>
              <View style={[styles.alertHeader, { backgroundColor: theme.errorAlpha, borderColor: theme.error + '40', borderWidth: 1, borderRadius: 12, padding: 12 }]}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: theme.error }]}>
                    {displayAlerts.length} área{displayAlerts.length > 1 ? 's' : ''} requiere atención
                  </Text>
                  <Text style={[styles.alertSubtitle, { color: theme.textSecondary }]}>
                    Menos del 60% de tareas completadas
                  </Text>
                </View>
              </View>
            </View>
          )}

            {/* Resumen Jerárquico por Tipo de Área */}
            {(metricsByType.secretaria.total > 0 || metricsByType.direccion.total > 0) && (
              <Animated.View style={{
                opacity: Platform.OS === 'web' ? 1 : hierarchyAnim,
                transform: Platform.OS === 'web' ? [] : [{ translateY: hierarchySlide }]
              }}>
                <View style={[styles.hierarchySectionWrapper, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
                  {/* Header de sección */}
                  <View style={styles.hierarchySectionHeader}>
                    <LinearGradient
                      colors={theme.gradientHeader}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.hierarchySectionIcon}
                    >
                      <Ionicons name="git-network" size={24} color="#FFF" />
                    </LinearGradient>
                    <View style={styles.hierarchySectionTitleContainer}>
                      <Text style={[styles.hierarchySectionTitle, { color: theme.text }]}>
                        Rendimiento por Jerarquía
                      </Text>
                      <Text style={[styles.hierarchySectionSubtitle, { color: theme.textSecondary }]}>
                        Comparativa Secretarías vs Direcciones
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.hierarchyCardsRow}>
                    {/* Tarjeta Secretarías - Premium Design */}
                    <Animated.View style={[
                      styles.hierarchyCardWrapper,
                      Platform.OS === 'web' ? {} : { transform: [{ scale: secretariaScale }] }
                    ]}>
                      <TouchableOpacity 
                        onPress={() => setFilteredAreas(metricsByType.secretaria.areas.map(a => a.name))}
                        activeOpacity={0.85}
                        style={styles.hierarchyCardTouchable}
                      >
                        <LinearGradient
                          colors={theme.gradientHeader}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.hierarchyCardGradient}
                        >
                          {/* Overlay para efecto glassmorphism */}
                          <View style={[styles.hierarchyGlassOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)' }]} />
                          
                          {/* Header de tarjeta */}
                          <View style={styles.hierarchyCardHeader}>
                            <View style={styles.hierarchyCardIconContainer}>
                              <View style={styles.hierarchyCardIconBg}>
                                <Ionicons name="briefcase" size={28} color="#FFF" />
                              </View>
                            </View>
                            <View style={styles.hierarchyCardTitleArea}>
                              <Text style={styles.hierarchyCardTitle}>Secretarías</Text>
                              <Text style={styles.hierarchyCardCount}>
                                {metricsByType.secretaria.areas.length} áreas activas
                              </Text>
                            </View>
                            <Animated.View style={[styles.hierarchyRateBadge, Platform.OS === 'web' ? {} : { transform: [{ scale: pulseAnim }] }]}>
                              <Text style={styles.hierarchyRateBadgeText}>
                                {metricsByType.secretaria.avgRate}%
                              </Text>
                            </Animated.View>
                          </View>
                          
                          {/* Barra de progreso */}
                          <View style={styles.hierarchyProgressWrapper}>
                            <View style={styles.hierarchyProgressTrack}>
                              <View style={[styles.hierarchyProgressFill, { width: `${metricsByType.secretaria.avgRate}%`, backgroundColor: 'rgba(255,255,255,0.9)' }]} />
                            </View>
                          </View>
                          
                          {/* Métricas en grid */}
                          <View style={styles.hierarchyMetricsGrid}>
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={styles.hierarchyMetricValue}>{metricsByType.secretaria.total}</Text>
                              <Text style={styles.hierarchyMetricLabel}>Total</Text>
                            </View>
                            <View style={styles.hierarchyMetricDivider} />
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={[styles.hierarchyMetricValue, { color: '#A7F3D0' }]}>
                                {metricsByType.secretaria.completed}
                              </Text>
                              <Text style={styles.hierarchyMetricLabel}>Completadas</Text>
                            </View>
                            <View style={styles.hierarchyMetricDivider} />
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={[styles.hierarchyMetricValue, { color: '#FDE68A' }]}>
                                {metricsByType.secretaria.pending}
                              </Text>
                              <Text style={styles.hierarchyMetricLabel}>Pendientes</Text>
                            </View>
                            {metricsByType.secretaria.overdue > 0 && (
                              <>
                                <View style={styles.hierarchyMetricDivider} />
                                <View style={styles.hierarchyMetricBox}>
                                  <Text style={[styles.hierarchyMetricValue, { color: '#FCA5A5' }]}>
                                    {metricsByType.secretaria.overdue}
                                  </Text>
                                  <Text style={styles.hierarchyMetricLabel}>Vencidas</Text>
                                </View>
                              </>
                            )}
                          </View>
                          
                          {/* Footer con indicador de tap */}
                          <View style={styles.hierarchyCardFooter}>
                            <Text style={styles.hierarchyTapHint}>Toca para filtrar</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>

                    {/* Tarjeta Direcciones - Premium Design */}
                    <Animated.View style={[
                      styles.hierarchyCardWrapper,
                      Platform.OS === 'web' ? {} : { transform: [{ scale: direccionScale }] }
                    ]}>
                      <TouchableOpacity 
                        onPress={() => setFilteredAreas(metricsByType.direccion.areas.map(a => a.name))}
                        activeOpacity={0.85}
                        style={styles.hierarchyCardTouchable}
                      >
                        <LinearGradient
                          colors={[theme.info, isDark ? theme.info + 'CC' : theme.info]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.hierarchyCardGradient}
                        >
                          {/* Overlay para efecto glassmorphism */}
                          <View style={[styles.hierarchyGlassOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)' }]} />
                          
                          {/* Header de tarjeta */}
                          <View style={styles.hierarchyCardHeader}>
                            <View style={styles.hierarchyCardIconContainer}>
                              <View style={styles.hierarchyCardIconBg}>
                                <Ionicons name="folder-open" size={28} color="#FFF" />
                              </View>
                            </View>
                            <View style={styles.hierarchyCardTitleArea}>
                              <Text style={styles.hierarchyCardTitle}>Direcciones</Text>
                              <Text style={styles.hierarchyCardCount}>
                                {metricsByType.direccion.areas.length} áreas activas
                              </Text>
                            </View>
                            <Animated.View style={[styles.hierarchyRateBadge, Platform.OS === 'web' ? {} : { transform: [{ scale: pulseAnim }] }]}>
                              <Text style={styles.hierarchyRateBadgeText}>
                                {metricsByType.direccion.avgRate}%
                              </Text>
                            </Animated.View>
                          </View>
                          
                          {/* Barra de progreso */}
                          <View style={styles.hierarchyProgressWrapper}>
                            <View style={styles.hierarchyProgressTrack}>
                              <View style={[styles.hierarchyProgressFill, { width: `${metricsByType.direccion.avgRate}%`, backgroundColor: 'rgba(255,255,255,0.9)' }]} />
                            </View>
                          </View>
                          
                          {/* Métricas en grid */}
                          <View style={styles.hierarchyMetricsGrid}>
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={styles.hierarchyMetricValue}>{metricsByType.direccion.total}</Text>
                              <Text style={styles.hierarchyMetricLabel}>Total</Text>
                            </View>
                            <View style={styles.hierarchyMetricDivider} />
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={[styles.hierarchyMetricValue, { color: '#A7F3D0' }]}>
                                {metricsByType.direccion.completed}
                              </Text>
                              <Text style={styles.hierarchyMetricLabel}>Completadas</Text>
                            </View>
                            <View style={styles.hierarchyMetricDivider} />
                            <View style={styles.hierarchyMetricBox}>
                              <Text style={[styles.hierarchyMetricValue, { color: '#FDE68A' }]}>
                                {metricsByType.direccion.pending}
                              </Text>
                              <Text style={styles.hierarchyMetricLabel}>Pendientes</Text>
                            </View>
                            {metricsByType.direccion.overdue > 0 && (
                              <>
                                <View style={styles.hierarchyMetricDivider} />
                                <View style={styles.hierarchyMetricBox}>
                                  <Text style={[styles.hierarchyMetricValue, { color: '#FCA5A5' }]}>
                                    {metricsByType.direccion.overdue}
                                  </Text>
                                  <Text style={styles.hierarchyMetricLabel}>Vencidas</Text>
                                </View>
                              </>
                            )}
                          </View>
                          
                          {/* Footer con indicador de tap */}
                          <View style={styles.hierarchyCardFooter}>
                            <Text style={styles.hierarchyTapHint}>Toca para filtrar</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  
                  {/* Botón de limpiar filtro */}
                  {filteredAreas.length > 0 && (
                    <TouchableOpacity 
                      style={[styles.clearFilterButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
                      onPress={() => setFilteredAreas([])}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={18} color={theme.primary} />
                      <Text style={[styles.clearFilterButtonText, { color: theme.primary }]}>
                        Limpiar filtro ({filteredAreas.length} áreas seleccionadas)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Area Metrics - Detailed Cards */}
            {Object.keys(displayDetailedMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="stats-chart" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Estadísticas por Área</Text>
                </View>
                <View style={styles.areaCardsContainer}>
                  {Object.entries(displayDetailedMetrics)
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
                        onPress={() => setSelectedArea(area)}
                      />
                    ))}
                </View>
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
                transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="bar-chart-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Estadísticas Detalladas
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Aquí verás métricas de cada área
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Area Comparison Chart */}
            {Object.keys(displayAreaMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="arrow-forward-outline" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Comparación de Rendimiento</Text>
                </View>
                <Suspense fallback={<ShimmerEffect width="100%" height={200} borderRadius={8} />}>
                  <AreaComparisonChart
                    areaMetrics={displayAreaMetrics}
                    padding={padding}
                    isDesktop={isDesktop}
                    onAreaSelect={(area) => setSelectedArea(area)}
                  />
                </Suspense>
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
                transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="trending-up-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Comparación de Rendimiento
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Visualiza el desempeño entre áreas
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Area Ranking */}
            {Object.keys(displayDetailedMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="podium-outline" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Ranking de Áreas</Text>
                </View>
                <AreaRankingCard
                  areaMetrics={displayDetailedMetrics}
                  taskCountByArea={displayAreaMetrics}
                  overdueByArea={Object.entries(displayDetailedMetrics).reduce((acc, [area, metrics]) => {
                    acc[area] = metrics.overdue || 0;
                    return acc;
                  }, {})}
                  onAreaPress={(area) => setSelectedArea(area)}
                />
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: Platform.OS === 'web' ? 1 : chartsOpacity,
                transform: Platform.OS === 'web' ? [] : [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="medal-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Ranking de Áreas
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Posiciones según desempeño
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Selected Area Details */}
            {selectedArea && displayAreaMetrics[selectedArea] && (
              <SpringCard style={[styles.chartCard, { borderWidth: 2, borderColor: theme.primary }]}>
                <View style={styles.selectedAreaHeader}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>{selectedArea}</Text>
                  <TouchableOpacity onPress={() => setSelectedArea(null)}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.selectedAreaStats}>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Completadas</Text>
                    <Text style={[styles.statBlockValue, { color: theme.success }]}>
                      {displayAreaMetrics[selectedArea].completed}
                    </Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Total</Text>
                    <Text style={[styles.statBlockValue, { color: theme.text }]}>
                      {displayAreaMetrics[selectedArea].total}
                    </Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Atrasadas</Text>
                    <Text style={[styles.statBlockValue, { color: theme.error }]}>
                      {displayAreaMetrics[selectedArea].overdue || 0}
                    </Text>
                  </View>
                  {displayDetailedMetrics[selectedArea]?.userCount > 0 && (
                    <View style={styles.statBlock}>
                      <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Usuarios</Text>
                      <Text style={[styles.statBlockValue, { color: theme.text }]}>
                        {displayDetailedMetrics[selectedArea].userCount}
                      </Text>
                    </View>
                  )}
                </View>
              </SpringCard>
            )}

            {/* Area Metrics - Premium Quick View */}
            {Object.keys(displayAreaMetrics).length > 0 && (
              <SpringCard style={styles.chartCard}>
                {/* Header premium */}
                <View style={styles.quickMetricsHeader}>
                  <View style={[styles.quickMetricsIconBg, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="speedometer" size={22} color={theme.primary} />
                  </View>
                  <View style={styles.quickMetricsTitleContainer}>
                    <Text style={[styles.quickMetricsTitle, { color: theme.text }]}>
                      Rendimiento por Área
                    </Text>
                    <Text style={[styles.quickMetricsSubtitle, { color: theme.textSecondary }]}>
                      {Object.keys(displayAreaMetrics).length} áreas monitoreadas
                    </Text>
                  </View>
                </View>
                
                <View style={styles.quickMetricsGrid}>
                  {Object.entries(displayAreaMetrics).map(([area, metrics], _index) => {
                    const rate = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;
                    const statusColor = rate >= 75 ? theme.success : rate >= 50 ? theme.warning : theme.error;
                    const statusBg = rate >= 75 ? theme.successAlpha : rate >= 50 ? theme.warningAlpha : theme.errorAlpha;
                    const statusIcon = rate >= 75 ? 'checkmark-circle' : rate >= 50 ? 'time' : 'alert-circle';
                    
                    return (
                      <TouchableOpacity 
                        key={area} 
                        style={[styles.quickMetricCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}
                        onPress={() => setSelectedArea(area)}
                        activeOpacity={0.7}
                      >
                        {/* Badge de estado */}
                        <View style={[styles.quickMetricStatusBadge, { backgroundColor: statusBg }]}>
                          <Ionicons name={statusIcon} size={14} color={statusColor} />
                        </View>
                        
                        {/* Nombre del área */}
                        <Text style={[styles.quickMetricAreaName, { color: theme.text }]} numberOfLines={2}>
                          {area.replace('Secretaría de ', '').replace('Dirección de ', '')}
                        </Text>
                        
                        {/* Barra de progreso premium */}
                        <View style={styles.quickMetricProgressContainer}>
                          <View style={[styles.quickMetricProgressTrack, { backgroundColor: theme.border }]}>
                            <Animated.View 
                              style={[
                                styles.quickMetricProgressBar,
                                { 
                                  width: `${rate}%`,
                                  backgroundColor: statusColor
                                }
                              ]}
                            />
                          </View>
                        </View>
                        
                        {/* Stats row */}
                        <View style={styles.quickMetricStatsRow}>
                          <View style={styles.quickMetricStatItem}>
                            <Text style={[styles.quickMetricStatValue, { color: statusColor }]}>
                              {Math.round(rate)}%
                            </Text>
                          </View>
                          <View style={[styles.quickMetricStatDivider, { backgroundColor: theme.border }]} />
                          <View style={styles.quickMetricStatItem}>
                            <Text style={[styles.quickMetricStatLabel, { color: theme.textSecondary }]}>
                              {metrics.completed}/{metrics.total}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Indicador de vencidas si hay */}
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
                  })}
                </View>
              </SpringCard>
            )}
        </ScrollView>
      </View>

      {/* Modal de gráficas detalladas */}
      <Modal
        visible={showChartsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChartsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Gráficas detalladas</Text>
              <TouchableOpacity onPress={() => setShowChartsModal(false)}>
                <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Subtareas */}
              {(subtasksStats.completed > 0 || subtasksStats.pending > 0) && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="checkmark-done" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Progreso de subtareas</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { label: 'Completadas', value: subtasksStats.completed, color: theme.success },
                      { label: 'Pendientes', value: subtasksStats.pending, color: theme.warning },
                      { label: 'Completado', value: `${subtasksStats.completionRate}%`, color: theme.primary },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }}>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: s.color }}>{s.value}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Progreso de tareas con subtareas */}
              {tasksWithProgress.filter(t => t.subtasksTotal > 0).length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="list" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Tareas con más avance (top 10)</Text>
                  </View>
                  {tasksWithProgress.filter(t => t.subtasksTotal > 0).map((tp, i) => (
                    <View key={tp.id} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: theme.text, flex: 1 }} numberOfLines={1}>{i + 1}. {tp.title}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>{tp.progress}%</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${tp.progress}%`, height: '100%', backgroundColor: tp.progress === 100 ? theme.success : tp.progress >= 50 ? theme.info : theme.warning, borderRadius: 3 }} />
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{tp.subtasksCompleted}/{tp.subtasksTotal} subtareas</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Gráfica de completadas por día */}
              {dailyCompletions.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="trending-up" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Completadas por día</Text>
                  </View>
                  <Suspense fallback={<ShimmerEffect width="100%" height={180} borderRadius={8} />}>
                    <LineChart
                      data={chartData}
                      width={width - (padding * 2 + 64)}
                      height={180}
                      chartConfig={{
                        backgroundColor: theme.card,
                        backgroundGradientFrom: theme.card,
                        backgroundGradientTo: theme.card,
                        color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
                        strokeWidth: 2,
                        style: { borderRadius: 12 },
                        labelColor: () => theme.textSecondary,
                      }}
                      style={{ borderRadius: 12 }}
                    />
                  </Suspense>
                </View>
              )}

              {/* Distribución por prioridad */}
              {priorityChartData.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="flag" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Distribución por prioridad</Text>
                  </View>
                  <Suspense fallback={<ShimmerEffect width="100%" height={180} borderRadius={8} />}>
                    <PieChart
                      data={priorityChartData}
                      width={width - (padding * 2 + 64)}
                      height={180}
                      chartConfig={{ color: (opacity = 1) => `rgba(255,255,255,${opacity})` }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="10"
                    />
                  </Suspense>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, isDesktopLarge, width, _padding) => {
  const responsiveHeaderPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const responsiveContentPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    contentWrapper: {
      flex: 1,
      width: '100%',
      maxWidth: Platform.OS === 'web' ? MAX_WIDTHS.content : width,
      alignSelf: 'center',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    headerGradientInner: {
      paddingHorizontal: responsiveHeaderPadding,
      paddingTop: isDesktop ? 28 : 48,
      paddingBottom: 20,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleGroup: {
      gap: 2,
    },
    headerLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 1.5,
    },
    heading: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    headerRightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerAlertBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.error,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      gap: 4,
    },
    headerAlertText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    headerStatMini: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    headerStatMiniValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerStatMiniLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.5,
    },
    scroll: {
      flex: 1,
      width: '100%',
      minHeight: Platform.OS === 'web' ? '100vh' : 'auto',
    },
    scrollContent: {
      paddingHorizontal: responsiveContentPadding,
      paddingTop: 20,
      paddingBottom: 80,
    },
    // ✨ Period Card Premium
    periodCard: {
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
    },
    periodTabs: {
      flexDirection: 'row',
      gap: 4,
    },
    periodTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 9,
      gap: 5,
    },
    periodTabActive: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    periodTabLabel: {
      fontSize: 13,
      fontWeight: '700',
    },
    periodTabFullLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    // ✨ Stats Grid Premium
    // ✨ Summary Card Premium
    summaryCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    summaryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    summaryIconBg: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    summaryValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    summaryValue: {
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    summaryPercent: {
      fontSize: 22,
      fontWeight: '700',
      marginLeft: 2,
    },
    summaryTrend: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    // ✨ Metrics Row Compacto
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    metricItem: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    metricAccentBar: {
      height: 4,
      width: '100%',
      marginBottom: 10,
    },
    metricNumber: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -1,
      textAlign: 'center',
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
      marginBottom: 12,
      textAlign: 'center',
      letterSpacing: 0.1,
    },
    // Legacy stat styles (for compatibility)
    stat: {
      width: isDesktop ? '23%' : '48%',
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    statContent: {
      alignItems: 'center',
      width: '100%',
    },
    statIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    chartCard: {
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    chart: {
      borderRadius: 16,
      marginVertical: 0,
    },
    areaMetricsGrid: {
      gap: 16,
    },
    areaMetricItem: {
      gap: 8,
    },
    areaName: {
      fontSize: 14,
      fontWeight: '700',
    },
    areaProgressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    areaProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    areaStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    areaCount: {
      fontSize: 12,
      fontWeight: '600',
    },
    areaPercent: {
      fontSize: 12,
      fontWeight: '700',
    },
    // Subtasks Statistics Styles
    subtasksStatsSection: {
      marginVertical: 16,
      paddingHorizontal: responsiveContentPadding,
    },
    subtaskCard: {
      borderRadius: 16,
      padding: 20,
    },
    subtaskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    subtaskTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    subtaskStatsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    subtaskStat: {
      alignItems: 'center',
      flex: 1,
    },
    subtaskStatValue: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 4,
    },
    subtaskStatLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressRingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    progressRing: {
      borderRadius: 60,
      overflow: 'hidden',
    },
    progressRingFill: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Task Progress Styles
    tasksProgressContainer: {
      marginTop: 12,
      gap: 12,
    },
    // Empty State Styles
    emptyStateIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyStateSubtitle: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 16,
    },
    emptyStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    emptyStatLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 2,
    },
    emptyStatValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    emptyStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    emptyHelpBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    emptyHelpText: {
      fontSize: 11,
      fontWeight: '500',
      flex: 1,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    emptyCardContainer: {
      minHeight: 240,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCardContent: {
      alignItems: 'center',
      gap: 12,
    },
    emptyCardIcon: {
      width: 72,
      height: 72,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyCardSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    taskProgressContainer: {
      marginTop: 12,
      gap: 12,
    },
    taskProgressItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(159, 34, 65, 0.1)' : 'rgba(159, 34, 65, 0.05)',
    },
    taskProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    taskProgressTitle: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      marginRight: 8,
    },
    taskProgressPercent: {
      fontSize: 12,
      fontWeight: '700',
    },
    taskProgressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    taskProgressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    taskProgressDetail: {
      fontSize: 11,
      fontWeight: '500',
    },
    // New Area Metrics Styles
    areaCardsContainer: {
      gap: 12,
      marginTop: 12,
    },
    alertSection: {
      marginBottom: 16,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    alertSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      opacity: 0.8,
    },
    selectedAreaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    selectedAreaStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statBlock: {
      flex: 1,
      minWidth: '45%',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
      alignItems: 'center',
    },
    statBlockLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 4,
    },
    statBlockValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    // ✨ Estilos para botón de exportación
    chartsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 8,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    exportButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    // ✨ NUEVOS Estilos Premium para sección jerárquica
    hierarchySectionWrapper: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    hierarchySectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
    },
    hierarchySectionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    hierarchySectionTitleContainer: {
      flex: 1,
    },
    hierarchySectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    hierarchySectionSubtitle: {
      fontSize: 13,
      marginTop: 4,
      fontWeight: '500',
    },
    hierarchyCardsRow: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: 16,
    },
    hierarchyCardWrapper: {
      flex: 1,
    },
    hierarchyCardTouchable: {
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    hierarchyCardGradient: {
      padding: 20,
      borderRadius: 20,
      minHeight: 240,
    },
    hierarchyGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
    hierarchyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      zIndex: 1,
    },
    hierarchyCardIconContainer: {
      marginRight: 14,
    },
    hierarchyCardIconBg: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hierarchyCardTitleArea: {
      flex: 1,
    },
    hierarchyCardTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    hierarchyCardCount: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
    },
    hierarchyRateBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    hierarchyRateBadgeText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hierarchyProgressWrapper: {
      marginBottom: 20,
      zIndex: 1,
    },
    hierarchyProgressTrack: {
      height: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 5,
      overflow: 'hidden',
    },
    hierarchyProgressFill: {
      height: '100%',
      borderRadius: 5,
    },
    hierarchyMetricsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 8,
      marginBottom: 16,
      zIndex: 1,
    },
    hierarchyMetricBox: {
      flex: 1,
      alignItems: 'center',
    },
    hierarchyMetricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hierarchyMetricLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hierarchyMetricDivider: {
      width: 1,
      height: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    hierarchyCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      zIndex: 1,
    },
    hierarchyTapHint: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.6)',
    },
    clearFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1.5,
      alignSelf: 'center',
    },
    clearFilterButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    // Legacy styles (mantener compatibilidad)
    hierarchyContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: 16,
      marginTop: 16,
    },
    hierarchyCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 2,
      padding: 16,
    },
    hierarchyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    hierarchyIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hierarchyTitleContainer: {
      flex: 1,
    },
    hierarchyTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    hierarchySubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    hierarchyStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    hierarchyStat: {
      alignItems: 'center',
    },
    hierarchyStatValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    hierarchyStatLabel: {
      fontSize: 11,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hierarchyProgressContainer: {
      gap: 8,
    },
    hierarchyProgressBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    hierarchyProgress: {
      height: '100%',
      borderRadius: 4,
    },
    hierarchyRateText: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    clearFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      alignSelf: 'center',
    },
    clearFilterText: {
      fontSize: 13,
      fontWeight: '600',
    },
    // ✨ Quick Metrics Premium Styles
    quickMetricsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 14,
    },
    quickMetricsIconBg: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickMetricsTitleContainer: {
      flex: 1,
    },
    quickMetricsTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    quickMetricsSubtitle: {
      fontSize: 12,
      marginTop: 3,
      fontWeight: '500',
    },
    quickMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    quickMetricCard: {
      width: isDesktop ? 'calc(33.33% - 10px)' : isTablet ? 'calc(50% - 7px)' : '100%',
      minWidth: isDesktop ? 200 : isTablet ? 180 : 'auto',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    quickMetricStatusBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickMetricAreaName: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 14,
      paddingRight: 36,
      lineHeight: 20,
    },
    quickMetricProgressContainer: {
      marginBottom: 12,
    },
    quickMetricProgressTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    quickMetricProgressBar: {
      height: '100%',
      borderRadius: 4,
    },
    quickMetricStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    quickMetricStatItem: {
      alignItems: 'center',
    },
    quickMetricStatValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    quickMetricStatLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    quickMetricStatDivider: {
      width: 1,
      height: 20,
    },
    quickMetricOverdueTag: {
      position: 'absolute',
      bottom: 8,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.errorAlpha,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    quickMetricOverdueText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.error,
    },
  });
};
