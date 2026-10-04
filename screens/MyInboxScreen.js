// screens/MyInboxScreen.js
// "Mi bandeja": tareas que le corresponden al usuario, de la que vence primero a la que
// vence al final, con búsqueda, filtros, mensajes recientes y selección múltiple (admin).
// El filtrado, los mensajes y la eliminación viven en la carpeta inbox/.
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
  Easing,
  Platform,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from './inbox/TaskItem';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import ScreenHeader from '../components/ui/ScreenHeader';
import { updateTask } from '../services/tasks';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import { canChangeTaskStatus } from '../services/permissions';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { scheduleOverdueTasksNotification, scheduleMultipleDailyOverdueNotifications } from '../services/notifications';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { isOverdue } from '../utils/dateUtils';
import { createStyles } from './inbox/MyInboxScreenStyles';
import { EMPTY_FILTERS, filterInboxTasks, uniqueTaskAreas } from './inbox/inboxFilters';
import { useRecentMessages } from './inbox/useRecentMessages';
import { useTaskDeletion } from './inbox/useTaskDeletion';
import { InboxFiltersModal, ActiveFilterChips } from './inbox/InboxFilterControls';
import { HelpModal, MessagesModal } from './inbox/InboxModals';

export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { tasks, setTasks, isLoading: tasksLoading, currentUser } = useTasks();

  const [refreshing, setRefreshing] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [compactView, setCompactView] = useState(false);

  const recentMessages = useRecentMessages(tasks, currentUser);
  const { deletingTaskIds, deleteTask, deleteTasks } = useTaskDeletion({
    currentUser,
    setTasks,
    notify: { showSuccess, showError, showWarning, showInfo },
  });

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // Entrada del encabezado — espera a que termine la transición de navegación
  useEffect(() => {
    const start = () => {
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    };
    if (Platform.OS === 'web') {
      start();
      return undefined;
    }
    const interaction = InteractionManager.runAfterInteractions(start);
    return () => interaction.cancel();
  }, [headerOpacity, headerSlide]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      if (isMountedRef.current) setRefreshing(false);
    }, 1000);
  }, []);

  const filtered = useMemo(
    () => filterInboxTasks(tasks, currentUser, searchText, filters),
    [tasks, currentUser, searchText, filters]
  );
  const overdueTasks = useMemo(() => filtered.filter((task) => isOverdue(task)), [filtered]);
  const overdueCount = overdueTasks.length;
  const areas = useMemo(() => uniqueTaskAreas(tasks), [tasks]);

  // Aviso diario de tareas vencidas: se programa una sola vez al día
  const lastScheduledRef = useRef(null);
  useEffect(() => {
    if (overdueCount === 0) return;
    const today = new Date().toDateString();
    if (lastScheduledRef.current === today) return;
    scheduleOverdueTasksNotification(overdueTasks); // 9 AM
    scheduleMultipleDailyOverdueNotifications(overdueTasks); // 9 AM, 2 PM y 6 PM
    lastScheduledRef.current = today;
  }, [overdueCount, overdueTasks]);

  const toggleTaskSelection = (taskId) => {
    const updated = new Set(selectedTaskIds);
    if (updated.has(taskId)) updated.delete(taskId);
    else updated.add(taskId);
    setSelectedTaskIds(updated);
    hapticMedium();
  };

  const changeStatus = async (taskId, newStatus) => {
    // Misma regla que en Inicio y Kanban: cada rol solo puede hacer sus transiciones
    const task = tasks.find((t) => t.id === taskId);
    const perm = canChangeTaskStatus(currentUser, task || { id: taskId }, newStatus);
    if (!perm.canChange) {
      showWarning(perm.reason || 'No tienes permisos para cambiar el estado');
      return;
    }
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      showError(e?.code === 'permission-denied' ? e.message : 'No se pudo actualizar la tarea');
    }
  };

  const toggleComplete = async (task) => {
    if (task.status === 'cerrada' && currentUser?.role !== 'admin') {
      showWarning('Solo administradores pueden reabrir tareas');
      return;
    }
    await changeStatus(task.id, task.status === 'cerrada' ? 'pendiente' : 'cerrada');
  };

  const openDetail = (task) => {
    const canEdit = currentUser && ['admin', 'secretario', 'director'].includes(currentUser.role);
    if (!canEdit) {
      showInfo('No tienes permisos para editar tareas');
      return;
    }
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  };

  const openChat = (task) => navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });

  const goToCreate = () => {
    // Solo el admin crea tareas principales
    if (currentUser?.role !== 'admin') {
      showWarning('Solo administradores pueden crear tareas. Los secretarios y directores solo pueden crear subtareas.');
      return;
    }
    navigation.navigate('TaskDetail');
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  const renderItem = ({ item }) => {
    const isAdmin = currentUser?.role === 'admin';
    const isSelected = selectedTaskIds.has(item.id);
    const isDeleting = deletingTaskIds.has(item.id);

    return (
      <View style={[
        styles.itemWrapper,
        isSelected && { backgroundColor: theme.infoAlpha, borderColor: theme.info + '40', borderWidth: 1 },
      ]}>
        {/* Selección múltiple (admin) */}
        {isAdmin && (
          <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Seleccionar tarea" accessibilityState={{ checked: isSelected }}
            onPress={() => toggleTaskSelection(item.id)}
            style={[
              styles.selectionCircle,
              isSelected
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)' },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <TaskItem
            task={item}
            compact={compactView}
            onPress={() => !isDeleting && openDetail(item)}
            onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
            onToggleComplete={() => !isDeleting && toggleComplete(item)}
            onReopen={isAdmin ? () => !isDeleting && changeStatus(item.id, 'pendiente') : undefined}
            onChangeStatus={item.status !== 'cerrada'
              ? (task, newStatus) => !isDeleting && changeStatus(task.id, newStatus)
              : undefined}
            onChat={(task) => openChat(task)}
            currentUserRole={currentUser?.role || 'director'}
            isDeleting={isDeleting}
          />
        </View>
      </View>
    );
  };

  const glassCard = {
    backgroundColor: theme.glass,
    borderColor: theme.glassBorder,
  };

  // Mientras se cargan las tareas
  if (tasksLoading && !currentUser) {
    return (
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrapper}>
                  <Ionicons name="file-tray-full" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.greeting}>Mi Bandeja</Text>
                  <Text style={styles.heading}>Cargando...</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          <View style={{ flex: 1, padding: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[glassCard, { borderWidth: 1, padding: 16, borderRadius: 16, marginBottom: 12 }]}>
                <ShimmerEffect width="70%" height={18} style={{ marginBottom: 8 }} />
                <ShimmerEffect width="100%" height={14} style={{ marginBottom: 6 }} />
                <ShimmerEffect width="40%" height={12} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
          <ScreenHeader
            title="Mi Bandeja"
            subtitle={`${filtered.length} ${filtered.length === 1 ? 'tarea' : 'tareas'}`}
            actions={[
              // Vencidas: tocar activa o quita el filtro
              overdueCount > 0 && {
                icon: 'warning',
                label: filters.overdue ? 'Quitar filtro de vencidas' : 'Ver solo vencidas',
                badge: overdueCount,
                active: filters.overdue,
                onPress: () => setFilters((prev) => ({ ...prev, overdue: !prev.overdue })),
              },
              recentMessages.length > 0 && {
                icon: 'chatbubbles',
                label: 'Mensajes recientes',
                badge: recentMessages.length,
                onPress: () => { hapticMedium(); setShowMessagesModal(true); },
              },
              { icon: 'help-circle-outline', label: 'Ayuda', onPress: () => { hapticLight(); setShowHelpModal(true); } },
              currentUser?.role === 'admin' && { icon: 'add', label: 'Nueva tarea', primary: true, onPress: goToCreate },
            ].filter(Boolean)}
          />
        </Animated.View>

        {/* Búsqueda */}
        <View style={[styles.searchCompact, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.75)', borderBottomColor: theme.glassBorder }]}>
          <View style={[styles.searchRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar tareas..."
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            <View style={[styles.searchDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={[styles.filterIconBtn, showFilters && { backgroundColor: theme.primary }]}
              onPress={() => setShowFilters(!showFilters)}
              accessibilityRole="button"
              accessibilityLabel="Opciones"
            >
              <Ionicons name="options" size={18} color={showFilters ? '#FFFFFF' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ActiveFilterChips
          filters={filters}
          onChange={setFilters}
          searchText={searchText}
          onSearchChange={setSearchText}
          styles={styles}
          theme={theme}
        />

        {/* Acciones sobre las tareas seleccionadas */}
        {selectedTaskIds.size > 0 && (
          <View style={[styles.actionsBar, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.95)', borderColor: glassCard.borderColor }]}>
            <View style={styles.actionsBarLeft}>
              <View style={styles.selectionInfo}>
                <View style={[styles.selectionBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.selectionBadgeText}>{selectedTaskIds.size}</Text>
                </View>
                <Text style={[styles.selectionText, { color: theme.text }]}>
                  {selectedTaskIds.size === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}
                </Text>
              </View>
            </View>

            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={[styles.bulkActionBtn, { backgroundColor: theme.error }]}
                onPress={() => deleteTasks(selectedTaskIds, () => setSelectedTaskIds(new Set()))}
                accessibilityRole="button"
                accessibilityLabel="Eliminar"
              >
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionBtn, { backgroundColor: theme.textSecondary }]}
                onPress={() => setSelectedTaskIds(new Set())}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Vista normal o compacta */}
        <View style={[styles.compactToggleRow, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            style={[
              styles.compactToggleBtn,
              { backgroundColor: compactView ? theme.primary : (isDark ? theme.glass : theme.glassStrong) },
            ]}
            onPress={() => {
              hapticLight();
              setCompactView(!compactView);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={compactView ? 'Vista normal' : 'Vista compacta'}
            accessibilityRole="button"
          >
            <Ionicons
              name={compactView ? 'list' : 'grid-outline'}
              size={16}
              color={compactView ? '#fff' : theme.text}
            />
            <Text style={{ color: compactView ? '#fff' : theme.text, fontSize: 12, marginLeft: 4 }}>
              {compactView ? 'Normal' : 'Compacto'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={8}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-tray-outline"
              title="¡Bandeja vacía!"
              message="No tienes tareas en este momento. ¡Descansa y disfruta! 🎉"
              variant="success"
            />
          }
        />
      </View>

      <InboxFiltersModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={setFilters}
        areas={areas}
        styles={styles}
        theme={theme}
        isDark={isDark}
      />

      <HelpModal visible={showHelpModal} onClose={() => setShowHelpModal(false)} styles={styles} theme={theme} />

      <MessagesModal
        visible={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        messages={recentMessages}
        onOpenMessage={(message) => {
          setShowMessagesModal(false);
          navigation.navigate('TaskChat', { taskId: message.taskId, taskTitle: message.taskTitle });
        }}
        styles={styles}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}
