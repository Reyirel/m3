// screens/AreaChiefDashboard.js
// Dashboard para jefes de área - Ver tareas, progreso, equipo

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import ShimmerEffect from '../components/ShimmerEffect';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import { isInProgress } from '../utils/taskStatus';
import ScreenHeader from '../components/ui/ScreenHeader';
import { DURATION, timing } from '../theme/motion';
import { styles } from './dashboard/AreaChiefDashboardStyles';

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
    timing(fadeAnim, 1, { duration: DURATION.slow }).start();
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
      const tasksInProgress = taskList.filter((t) => isInProgress(t.status)).length;
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
      case 'en_proceso':
        return tasks.filter((t) => isInProgress(t.status));
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
                : isInProgress(task.status)
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
              fontSize: 12,
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
      <View style={[styles.container, { backgroundColor: theme.background, paddingHorizontal: 16, paddingTop: 60 }]}>
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
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 }]}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.errorAlpha, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' }}>Error de conexión</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>No se pudo cargar el dashboard.</Text>
        <TouchableOpacity
          onPress={() => { setLoadError(false); setLoading(true); loadChiefData(); }}
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
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
      style={[styles.container, { backgroundColor: theme.background }, { opacity: fadeAnim }]}
    >
      {/* Header */}
      <ScreenHeader
        title="Panel del área"
        subtitle="Tus tareas y equipo"
        onBack={() => navigation.goBack()}
        actions={[
          { icon: 'document-text', label: 'Ver reportes de mi área', onPress: () => navigation.navigate('Main', { screen: 'Reports', params: { tab: 'enviados' } }) },
        ]}
      />

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
          onPress={() => navigation.navigate('Main', { screen: 'Reports', params: { tab: 'enviados' } })}
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
          {['all', 'pendiente', 'en_proceso', 'completed'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterButton,
                filter === f
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.glass, borderColor: theme.glassBorder },
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
