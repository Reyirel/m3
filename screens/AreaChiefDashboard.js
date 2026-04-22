// screens/AreaChiefDashboard.js
// Dashboard para jefes de área - Ver tareas, progreso, equipo

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import ShimmerEffect from '../components/ShimmerEffect';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import WebSafeBlur from '../components/WebSafeBlur';
import AmbientOrbs from '../components/AmbientOrbs';

Dimensions.get('window');

export default function AreaChiefDashboard({ navigation }) {
  const { theme, isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pendiente, en_progreso, completed

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { tasks: contextTasks, isLoading: contextLoading } = useTasks();

  // Recalculate whenever context tasks update
  useEffect(() => {
    if (contextLoading) return;
    // TasksContext already filters by email for director role — use directly
    setTasks(contextTasks);
    calculateMetrics(contextTasks);
    setLoading(false);
    setRefreshing(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [contextTasks, contextLoading, fadeAnim]);

  const loadChiefData = () => {
    setRefreshing(true);
    // Refresh is automatic via context; just reset the flag after a brief delay
    setTimeout(() => setRefreshing(false), 600);
  };

  const calculateMetrics = (taskList) => {
    try {
      if (!taskList || taskList.length === 0) {
        setMetrics({
          fullyCompletedTasks: 0,
          tasksInProgress: 0,
          totalTasks: 0,
          avgProgress: 0,
        });
        return;
      }

      const fullyCompletedTasks = taskList.filter((t) => t.status === 'cerrada').length;
      const tasksInProgress = taskList.filter((t) => t.status === 'en_progreso' || t.status === 'en-progreso' || t.status === 'en_proceso').length;
      const totalTasks = taskList.length;
      
      // Calcular promedio de progreso de todas las tareas
      const avgProgress = taskList.length > 0
        ? Math.round(
            taskList.reduce((sum, t) => sum + (t.progress || 0), 0) / taskList.length
          )
        : 0;

      setMetrics({
        fullyCompletedTasks,
        tasksInProgress,
        totalTasks,
        avgProgress,
      });
    } catch (error) {
      if (__DEV__) console.error('Error calculando métricas:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChiefData();
  };

  const filteredTasksMemo = useMemo(() => {
    switch (filter) {
      case 'pendiente':
        return tasks.filter((t) => t.status === 'pendiente');
      case 'en_progreso':
        return tasks.filter((t) => t.status === 'en_progreso' || t.status === 'en-progreso' || t.status === 'en_proceso');
      case 'completed':
        return tasks.filter((t) => t.status === 'cerrada');
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const handleTaskPress = (task) => {
    navigation.navigate('TaskProgress', { taskId: task.id, task });
  };

  const renderTaskCard = ({ item: task }) => {
    // Obtener el área (buscar en ambos campos: area y areas)
    let areaDisplay = 'Sin área';
    if (task.area) {
      areaDisplay = task.area;
    } else if (task.areas && Array.isArray(task.areas) && task.areas.length > 0) {
      areaDisplay = task.areas[0];
    }

    return (
    <TouchableOpacity
      onPress={() => handleTaskPress(task)}
      style={[
        styles.taskCard,
        {
          backgroundColor: isDark ? theme.glass : theme.glassStrong,
          borderColor: theme.border,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor:
              task.status === 'cerrada'
                ? theme.success
                : task.status === 'en_progreso'
                ? theme.warning
                : theme.primary,
          },
        ]}
      />

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.taskMeta}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {areaDisplay}
          </Text>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            • {task.priority || 'normal'}
          </Text>
        </View>

        {/* Assignees */}
        {task.assignedToNames && task.assignedToNames.length > 0 && (
          <View style={styles.assigneesContainer}>
            {task.assignedToNames.slice(0, 3).map((name, idx) => (
              <Avatar key={idx} name={name} size={28} style={styles.assigneeAvatar} />
            ))}
            {task.assignedToNames.length > 3 && (
              <View style={[styles.moreAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.moreText}>+{task.assignedToNames.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary,
              textTransform: 'capitalize',
            }}
          >
            {task.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', paddingHorizontal: 16, paddingTop: 60 }]}>
        <ShimmerEffect width="60%" height={28} borderRadius={8} />
        <View style={{ marginTop: 20, gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={80} borderRadius={12} />
          ))}
        </View>
        <View style={{ marginTop: 20, gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={64} borderRadius={10} />
          ))}
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 }]}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.errorAlpha, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' }}>Error de conexión</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>No se pudo cargar el dashboard.</Text>
        <TouchableOpacity
          onPress={() => { setLoadError(false); setLoading(true); loadChiefData(); }}
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          accessibilityLabel="Reintentar" accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredTasks = filteredTasksMemo;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: 'transparent' }, { opacity: fadeAnim }]}
    >
      {/* Premium Ambient Orbs - Glasmorfismo */}
      <AmbientOrbs intensity="medium" />
      
      {/* Header */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { shadowColor: theme.primary }]}
      >
        <WebSafeBlur intensity={90} style={[styles.headerBlur, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', justifyContent: 'center', alignItems: 'center' }}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Tus tareas y equipo</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyAreaReports')}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </WebSafeBlur>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        style={styles.content}
      >
        {/* Métricas Generales */}
        {metrics && (
          <View style={styles.metricsSection}>
            <View style={[styles.metricCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle, borderWidth: 1 }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.fullyCompletedTasks}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Completadas
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle, borderWidth: 1 }]}>
              <Ionicons name="time" size={24} color={theme.warning} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.tasksInProgress}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                En Progreso
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle, borderWidth: 1 }]}>
              <Ionicons name="list" size={24} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.totalTasks}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle, borderWidth: 1 }]}>
              <Ionicons name="trending-up" size={24} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.avgProgress}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Progreso</Text>
            </View>
          </View>
        )}

        {/* Progress Overview */}
        {metrics && metrics.totalTasks > 0 && (
          <View style={[styles.progressCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle, borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Progreso General</Text>
            <ProgressBar
              progress={metrics.avgProgress}
              size="medium"
              showLabel={true}
              color={metrics.avgProgress === 100 ? theme.success : theme.primary}
            />
            <Text style={[styles.progressDetails, { color: theme.textSecondary }]}>
              {metrics.fullyCompletedTasks} de {metrics.totalTasks} tareas completadas
            </Text>
          </View>
        )}

        {/* Acceso a Reportes */}
        <TouchableOpacity
          onPress={() => navigation.navigate('MyAreaReports')}
          style={[styles.reportsButton, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: theme.primary }]}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.reportIconBg, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="document-text" size={24} color={theme.primary} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.reportsButtonTitle, { color: theme.text }]}>
                Reportes de Mi Área
              </Text>
              <Text style={[styles.reportsButtonDesc, { color: theme.textSecondary }]}>
                Ver y enviar reportes de avance
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Filtros */}
        <View style={styles.filterContainer}>
          {['all', 'pendiente', 'en_progreso', 'completed'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterButton,
                filter === f
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === f && { color: '#FFFFFF' },
                  { color: filter === f ? '#FFFFFF' : theme.text },
                ]}
              >
                {f === 'all'
                  ? 'Todas'
                  : f === 'completed'
                  ? 'Completadas'
                  : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tareas List */}
        <View style={styles.tasksSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {filter === 'all' ? 'Tus Tareas' : 'Tareas ' + filter.replace('_', ' ')}
          </Text>

          {filteredTasks.length > 0 ? (
            <FlatList
              data={filteredTasks}
              renderItem={renderTaskCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.tasksList}
              windowSize={5}
              maxToRenderPerBatch={6}
              initialNumToRender={8}
              removeClippedSubviews={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {filter === 'all'
                  ? 'Sin tareas asignadas'
                  : `Sin tareas ${filter.replace('_', ' ')}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  headerBlur: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  progressDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reportsButtonDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tasksSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBar: {
    width: 5,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  assigneesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  assigneeAvatar: {
    marginRight: -8,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});
