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
  Animated,
  Platform,
  useWindowDimensions,
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
import { canChangeTaskStatus, canEditTask } from '../services/permissions';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useResponsive } from '../utils/responsive';
import { BREAKPOINTS, MAX_WIDTHS } from '../theme/tokens';
import { SIDEBAR_WIDTH } from '../components/DesktopSidebar';
import { priorityLabel, statusColor, statusIcon, statusLabel } from '../utils/taskStatus';
import { useKanbanFilters } from '../hooks/useKanbanFilters';
import { createKanbanStyles } from './kanban/KanbanScreenStyles';
import { getColumnWidth } from './kanban/columnWidth';
import KanbanColumn from './kanban/KanbanColumn';
import { KanbanFiltersModal, KanbanHelpModal } from './kanban/KanbanModals';
import { QuickEditSheet, StatsSheet } from './kanban/KanbanSheets';
import { SPRING, spring, timing } from '../theme/motion';

const GestureHandlerRootView = getGestureHandlerRootView();

// Separación entre columnas en el teléfono (gap de styles.board)
const COLUMN_GAP = 8;
// Retraso de entrada de cada columna
const COLUMN_DELAYS_MS = [0, 60, 120, 180];
const EMPTY_GROUP = { byStatus: [], filtered: [], sorted: [] };

export default function KanbanScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const STATUSES = useMemo(() => [
    // Mismos nombres, iconos y colores de estado que en el resto de la app
    ...['pendiente', 'en_proceso', 'en_revision', 'cerrada'].map((key) => ({
      key,
      label: statusLabel(key),
      color: statusColor(key, theme),
      icon: statusIcon(key),
    })),
  ], [theme]);
  const { isDesktop } = useResponsive();
  const { tasks, isLoading, currentUser } = useTasks();
  const {
    filters, setFilters,
    sortBy, setSortBy,
    isTaskOverdue, taskStats, getFilteredByStatus,
  } = useKanbanFilters(tasks, currentUser);
  const { showSuccess, showError, showWarning } = useNotification();

  const [showStats, setShowStats] = useState(false);
  const dimensions = useWindowDimensions();
  const isAdmin = currentUser?.role === 'admin';
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

  // En tableta y escritorio la barra lateral ocupa parte del ancho: las columnas se
  // reparten lo que queda (antes se calculaban con toda la pantalla y se desbordaban)
  const boardWidth = dimensions.width - (dimensions.width >= BREAKPOINTS.tablet ? SIDEBAR_WIDTH : 0);
  const columnWidth = useMemo(() => getColumnWidth(boardWidth, Platform.OS === 'web'), [boardWidth]);

  useEffect(() => {
    const start = () => {
      Object.values(columnAnimations).forEach((animation, index) => {
        timing(animation, 1, { delay: COLUMN_DELAYS_MS[index] }).start();
      });
      spring(fabScale, 1, SPRING.enter, { delay: 100 }).start();
    };

    if (Platform.OS === 'web') {
      start();
      return undefined;
    }
    const interaction = InteractionManager.runAfterInteractions(start);
    return () => interaction.cancel();
  }, [columnAnimations, fabScale]);

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
    // La prioridad es parte del contenido de la tarea: solo la cambia quien puede editarla
    const permission = canEditTask(currentUser, tasks.find((t) => t.id === taskId));
    if (!permission.canEdit) {
      showWarning(permission.reason);
      hapticWarning();
      return;
    }
    try {
      await updateTask(taskId, { priority });
      hapticMedium();
      showSuccess(`Prioridad cambiada a ${priority}`);
      setQuickEditTask(null);
    } catch {
      // El panel sigue abierto con la prioridad anterior
      showError('No se pudo cambiar la prioridad');
      hapticWarning();
    }
  };

  // El detalle muestra las opciones que corresponden a cada rol
  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  }, [navigation]);

  const goToCreate = () => {
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
    backgroundColor: theme.glass,
    borderColor: theme.glassBorder,
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
                <View key={status.key} style={[glassCard, { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, minWidth: 200 }]}>
                  <ShimmerEffect width="60%" height={20} style={{ marginBottom: 12 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 10 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 10 }} />
                  <ShimmerEffect width="100%" height={80} style={{ borderRadius: 10 }} />
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
          <ScreenHeader
            title="Tablero"
            subtitle={taskStats.overdueCount > 0 ? `${taskStats.overdueCount} vencidas` : undefined}
            actions={[
              // Vencidas: tocar activa o quita el filtro
              taskStats.overdueCount > 0 && {
                icon: 'warning',
                label: filters.overdue ? 'Quitar filtro de vencidas' : 'Ver solo vencidas',
                badge: taskStats.overdueCount,
                active: filters.overdue,
                onPress: () => { setFilters({ ...filters, overdue: !filters.overdue }); hapticLight(); },
              },
              {
                icon: compactView ? 'list' : 'grid-outline',
                label: compactView ? 'Vista normal' : 'Vista compacta',
                active: compactView,
                onPress: () => { setCompactView(!compactView); hapticLight(); },
              },
              {
                icon: sortBy === 'date' ? 'time-outline' : 'flag-outline',
                label: sortBy === 'date' ? 'Ordenar por prioridad' : 'Ordenar por fecha',
                onPress: () => { setSortBy(sortBy === 'date' ? 'priority' : 'date'); hapticLight(); },
              },
              { icon: 'stats-chart', label: 'Ver estadísticas', onPress: () => setShowStats(!showStats) },
              { icon: 'help-circle-outline', label: 'Ayuda', onPress: () => { hapticLight(); setShowHelpModal(true); } },
            ].filter(Boolean)}
          />

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
                    {priorityLabel(filters.priority)}
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
              // Cada deslizamiento deja una columna alineada al borde
              snapToInterval={columnWidth + COLUMN_GAP}
              decelerationRate="fast"
            >
              {columns}
            </ScrollView>
          )}

          {/* Crear tarea (solo admin) */}
          {isAdmin && (
            <Animated.View style={{ transform: [{ scale: fabScale }], opacity: fabScale }}>
              <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={goToCreate}
                accessibilityRole="button"
                accessibilityLabel="Nueva tarea"
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}

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
            canClose={isAdmin}
            canEditPriority={isAdmin}
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
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
