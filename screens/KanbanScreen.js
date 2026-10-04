// screens/KanbanScreen.js
// Tablero Kanban con una columna por estado.
// Filtros, orden y conteos → hooks/useKanbanFilters.js
// Columnas, ventanas y paneles → screens/kanban/
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGestureHandlerRootView } from '../utils/platformComponents';
import ShimmerEffect from '../components/ShimmerEffect';
import { updateTask } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { hapticMedium, hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { canChangeTaskStatus } from '../services/permissions';
import QuickTip, { TIPS } from '../components/QuickTip';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { useKanbanFilters } from '../hooks/useKanbanFilters';
import { createKanbanStyles } from './kanban/KanbanScreenStyles';
import { getColumnWidth } from './kanban/columnWidth';
import KanbanColumn from './kanban/KanbanColumn';
import { KanbanFiltersModal, KanbanHelpModal } from './kanban/KanbanModals';
import { QuickEditSheet, StatsSheet } from './kanban/KanbanSheets';

const GestureHandlerRootView = getGestureHandlerRootView();

const PRIORITY_CHIP_LABELS = { alta: 'Urgente', media: 'Media', baja: 'Baja' };
// Retraso de entrada de cada columna
const COLUMN_DELAYS_MS = [0, 60, 120, 180];
const EMPTY_GROUP = { byStatus: [], filtered: [], sorted: [] };

export default function KanbanScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const STATUSES = useMemo(() => [
    { key: 'pendiente',   label: 'Pendiente',   color: theme.warning,   icon: 'hourglass-outline' },
    { key: 'en_proceso',  label: 'En proceso',  color: theme.info,      icon: 'play-circle-outline' },
    { key: 'en_revision', label: 'En revisión', color: theme.secondary, icon: 'eye-outline' },
    { key: 'cerrada',     label: 'Cerrada',     color: theme.success,   icon: 'checkmark-circle-outline' },
  ], [theme.warning, theme.info, theme.secondary, theme.success]);
  const { isDesktop } = useResponsive();
  const { tasks, isLoading, currentUser } = useTasks();
  const {
    filters, setFilters,
    sortBy, setSortBy,
    isTaskOverdue, taskStats, getFilteredByStatus,
  } = useKanbanFilters(tasks, currentUser);
  const { showSuccess, showError, showWarning } = useNotification();

  const [refreshing, setRefreshing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [compactView, setCompactView] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  // Tarea abierta en el panel de edición rápida
  const [quickEditTask, setQuickEditTask] = useState(null);

  // Entrada escalonada de las columnas y del botón de crear
  const columnAnimations = useRef({
    pendiente: new Animated.Value(0),
    en_proceso: new Animated.Value(0),
    en_revision: new Animated.Value(0),
    cerrada: new Animated.Value(0),
  }).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => subscription?.remove();
  }, []);

  const columnWidth = useMemo(() => getColumnWidth(dimensions.width, Platform.OS === 'web'), [dimensions.width]);

  useEffect(() => {
    const start = () => {
      Object.values(columnAnimations).forEach((animation, index) => {
        Animated.timing(animation, {
          toValue: 1,
          duration: 280,
          delay: COLUMN_DELAYS_MS[index],
          useNativeDriver: true,
        }).start();
      });
      Animated.spring(fabScale, { toValue: 1, delay: 100, friction: 6, tension: 40, useNativeDriver: true }).start();
    };

    if (Platform.OS === 'web') {
      start();
      return undefined;
    }
    const interaction = InteractionManager.runAfterInteractions(start);
    return () => interaction.cancel();
  }, [columnAnimations, fabScale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const changeStatus = useCallback(async (taskId, newStatus) => {
    try {
      // Cada rol solo puede hacer sus transiciones
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const permission = canChangeTaskStatus(currentUser, task, newStatus);
        if (!permission.canChange) {
          showWarning(permission.reason || 'No tienes permisos para este cambio');
          hapticWarning();
          return;
        }
      }
      hapticMedium();
      await updateTask(taskId, { status: newStatus });
      showSuccess('Estado actualizado correctamente');
      hapticSuccess();
    } catch {
      showError('Error al actualizar estado');
      hapticWarning();
    }
  }, [currentUser, tasks, showError, showSuccess, showWarning]);

  const changePriority = async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      hapticMedium();
      showSuccess(`Prioridad cambiada a ${priority}`);
      setQuickEditTask(null);
    } catch {
      // Si falla, el panel sigue abierto con la prioridad anterior
    }
  };

  // El detalle muestra las opciones que corresponden a cada rol
  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  }, [navigation]);

  const goToCreate = () => {
    if (currentUser?.role !== 'admin') {
      showWarning('Solo administradores pueden crear tareas');
      return;
    }
    hapticMedium();
    navigation.navigate('TaskDetail', { task: null });
  };

  const toggleMine = () => {
    setFilters({ ...filters, responsible: filters.responsible === currentUser.email ? '' : currentUser.email });
    hapticLight();
  };

  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach((status) => {
      grouped[status.key] = getFilteredByStatus(status.key, tasks);
    });
    return grouped;
  }, [tasks, getFilteredByStatus, STATUSES]);

  const styles = React.useMemo(() => createKanbanStyles(theme, isDark, columnWidth, dimensions), [theme, isDark, columnWidth, dimensions]);

  const glassCard = {
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
  };

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
            <LinearGradient
              colors={theme.gradientHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heading}>Tablero Kanban</Text>
                </View>
              </View>
            </LinearGradient>
            <View style={{ flex: 1, flexDirection: 'row', padding: 10, gap: 10 }}>
              {STATUSES.map((status) => (
                <View key={status.key} style={[glassCard, { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, minWidth: 200 }]}>
                  <ShimmerEffect width="60%" height={20} style={{ marginBottom: 12 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 8 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 8 }} />
                  <ShimmerEffect width="100%" height={80} style={{ borderRadius: 8 }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  const onlyMine = !!currentUser && filters.responsible === currentUser.email;

  const columns = STATUSES.map((status) => (
    <KanbanColumn
      key={status.key}
      status={status}
      group={tasksByStatus[status.key] || EMPTY_GROUP}
      animation={columnAnimations[status.key]}
      isTaskOverdue={isTaskOverdue}
      compact={compactView}
      onOpen={openDetail}
      onQuickEdit={setQuickEditTask}
      onStatusChange={changeStatus}
      styles={styles}
      theme={theme}
      isDark={isDark}
    />
  ));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={[styles.headerHighlight, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>Tablero Kanban</Text>
              </View>

              {/* Vencidas: tocar activa o quita el filtro */}
              {taskStats.overdueCount > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setFilters({ ...filters, overdue: !filters.overdue });
                    hapticLight();
                  }}
                  style={[styles.overdueHeaderBadge, filters.overdue && styles.overdueHeaderBadgeActive]}
                  activeOpacity={0.8}
                >
                  <View style={styles.overdueHeaderPulse}>
                    <Ionicons name="warning" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.overdueHeaderContent}>
                    <Text style={styles.overdueHeaderCount}>{taskStats.overdueCount}</Text>
                    <Text style={styles.overdueHeaderLabel}>vencidas</Text>
                  </View>
                  {filters.overdue && (
                    <View style={styles.overdueHeaderCheck}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => {
                    setCompactView(!compactView);
                    hapticLight();
                  }}
                  style={[styles.iconButton, compactView && styles.iconButtonActive]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={compactView ? 'Vista normal' : 'Vista compacta'}
                  accessibilityRole="button"
                >
                  <Ionicons name={compactView ? 'list' : 'grid-outline'} size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Ordenar por fecha o por prioridad */}
                <TouchableOpacity
                  onPress={() => {
                    setSortBy(sortBy === 'date' ? 'priority' : 'date');
                    hapticLight();
                  }}
                  style={styles.iconButton}
                >
                  <Ionicons name={sortBy === 'date' ? 'time-outline' : 'flag-outline'} size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowStats(!showStats)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Ver estadísticas"
                >
                  <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { hapticLight(); setShowHelpModal(true); }}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Ayuda"
                >
                  <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Filtros activos */}
          <View style={[styles.filterCompactBar, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.75)', borderBottomColor: glassCard.borderColor }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersRow}
              style={{ flex: 1 }}
            >
              {currentUser && (
                <TouchableOpacity
                  onPress={toggleMine}
                  style={[
                    styles.filterChipCompact,
                    { backgroundColor: onlyMine ? theme.primary : 'transparent', borderColor: theme.primary },
                  ]}
                >
                  <Ionicons name="person" size={14} color={onlyMine ? '#FFFFFF' : theme.primary} />
                  <Text style={[styles.filterChipCompactText, { color: onlyMine ? '#FFFFFF' : theme.primary }]}>
                    Mis tareas
                  </Text>
                </TouchableOpacity>
              )}

              {!!filters.priority && (
                <View style={[styles.filterChipCompact, { backgroundColor: theme.error, borderColor: theme.error }]}>
                  <Ionicons name="flash" size={14} color="#FFFFFF" />
                  <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]}>
                    {PRIORITY_CHIP_LABELS[filters.priority] || 'Baja'}
                  </Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, priority: '' })} accessibilityRole="button" accessibilityLabel="Quitar filtro">
                    <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {!!filters.searchText && (
                <View style={[styles.filterChipCompact, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <Ionicons name="search" size={14} color="#FFFFFF" />
                  <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]} numberOfLines={1}>
                    "{filters.searchText.substring(0, 15)}"
                  </Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, searchText: '' })} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                    <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setShowFiltersModal(true);
                hapticLight();
              }}
              style={[styles.filterModalButton, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Opciones"
            >
              <Ionicons name="options" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Columnas: en web se desplazan con el navegador; en el teléfono, con ScrollView */}
          {Platform.OS === 'web' ? (
            <View style={[styles.board, { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'row' }]}>
              {columns}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.board}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            >
              {columns}
            </ScrollView>
          )}

          {/* Crear tarea (solo admin) */}
          <Animated.View style={{ transform: [{ scale: fabScale }], opacity: fabScale }}>
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: theme.primary }]}
              onPress={goToCreate}
              accessibilityRole="button"
              accessibilityLabel="Agregar"
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <KanbanFiltersModal
            visible={showFiltersModal}
            onClose={() => setShowFiltersModal(false)}
            filters={filters}
            setFilters={setFilters}
            taskStats={taskStats}
            currentUser={currentUser}
            styles={styles}
            theme={theme}
            isDark={isDark}
          />

          <KanbanHelpModal visible={showHelpModal} onClose={() => setShowHelpModal(false)} styles={styles} theme={theme} />

          <QuickEditSheet
            task={quickEditTask}
            statuses={STATUSES}
            canClose={currentUser?.role === 'admin'}
            onChangePriority={changePriority}
            onChangeStatus={(taskId, status) => {
              changeStatus(taskId, status);
              setQuickEditTask(null);
            }}
            onClose={() => setQuickEditTask(null)}
            styles={styles}
            theme={theme}
            isDark={isDark}
          />

          <StatsSheet
            visible={showStats}
            onClose={() => setShowStats(false)}
            statuses={STATUSES}
            tasksByStatus={tasksByStatus}
            total={tasks.length}
            styles={styles}
            theme={theme}
            isDark={isDark}
          />

          <QuickTip {...TIPS.KANBAN_DRAG} position="bottom" delay={2500} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
