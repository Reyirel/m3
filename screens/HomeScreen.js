import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Platform, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getSwipeable } from '../utils/platformComponents';

import TaskCard from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/ShimmerEffect';
import EmptyState from '../components/EmptyState';
import ConfettiCelebration from '../components/ConfettiCelebration';
import HomeHeader from '../components/ui/HomeHeader';
import OverdueAlert from '../components/OverdueAlert';
import QuickTip, { TIPS } from '../components/QuickTip';
import OnboardingTour from '../components/OnboardingTour';
import QuickActionButton from '../components/QuickActionButton';

import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { useAccessibility } from '../hooks/useAccessibility';

import { deleteTask as deleteTaskFirebase, updateTask, restoreTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { canChangeTaskStatus, canDeleteTask } from '../services/permissions';
import { toMs } from '../utils/dateUtils';
import { deleteManager } from '../utils/deleteManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_WIDTHS } from '../theme/tokens';
import { countByStatus, matchesStatusFilter, statusLabel, isClosed } from '../utils/taskStatus';

const Swipeable = getSwipeable();

export default function HomeScreen({ navigation, onLogout }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError, showWarning, showInfo, showNotification } = useNotification();
  const { announce } = useAccessibility();

  const { tasks, setTasks, isLoading: tasksLoading, currentUser } = useTasks();
  const isLoading = tasksLoading;
  const [searchText, setSearchText] = useState('');
  const [quickStatusFilter, setQuickStatusFilter] = useState('todas');
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Persistent search per user
  useEffect(() => {
    if (!currentUser?.email) return;
    const key = currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AsyncStorage.getItem(`@home_search_${key}`)
      .then(saved => { if (saved) setSearchText(saved); })
      .catch(() => {});
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.email) return;
    const key = currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AsyncStorage.setItem(`@home_search_${key}`, searchText).catch(() => {});
  }, [searchText, currentUser?.email]);

  // Animations
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const deletingTasksRef = useRef(new Set());
  const searchRef = useRef(null);

  // Cmd+K / Ctrl+K → enfocar búsqueda (solo web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(listSlide, {
        toValue: 0, tension: 80, friction: 12, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!tasksLoading && tasks.length > 0) {
      if (fadeAnim._value !== 1) {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    }
  }, [tasksLoading, tasks, fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  }, [navigation]);

  const deleteTask = useCallback((taskId) => {
    if (deletingTasksRef.current.has(taskId)) return;
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) { showError('Tarea no encontrada'); return; }
    const perm = canDeleteTask(currentUser, taskToDelete);
    if (!perm.canDelete) { showError(perm.reason); return; }

    deletingTasksRef.current.add(taskId);
    deleteManager.markDeleting(taskId);
    hapticHeavy();
    setTasks(prev => prev.filter(t => t.id !== taskId));

    showNotification({
      message: 'Tarea eliminada · Toca para deshacer',
      type: 'success',
      duration: 8000,
      onPress: async () => {
        if (isUndoing) return;
        setIsUndoing(true);
        try {
          deleteManager.cancelDelete(taskId);
          deletingTasksRef.current.delete(taskId);
          // La tarea está en la papelera: se restaura la misma (conserva chat y subtareas)
          await restoreTask(taskId);
          showInfo('Tarea restaurada');
        } catch { showError('Error al restaurar'); }
        finally { setIsUndoing(false); }
      },
    });

    deleteTaskFirebase(taskId)
      .then(() => deleteManager.confirmDelete(taskId))
      .catch(() => {})
      .finally(() => { deletingTasksRef.current.delete(taskId); });
  }, [currentUser, isUndoing, tasks, setTasks, showNotification, showError, showInfo]);

  const toggleComplete = useCallback(async (task) => {
    try {
      const previousStatus = task.status;
      const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
      const perm = canChangeTaskStatus(currentUser, task, newStatus);
      if (!perm.canChange) { showWarning(perm.reason || 'Sin permisos'); return; }

      hapticMedium();
      await updateTask(task.id, { status: newStatus });

      if (newStatus === 'cerrada') {
        if (task.priority === 'alta') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          hapticHeavy();
        }
        showNotification({
          message: 'Tarea completada · Toca para deshacer',
          type: 'success',
          duration: 5000,
          onPress: async () => {
            if (isUndoing) return;
            setIsUndoing(true);
            try { await updateTask(task.id, { status: previousStatus }); showInfo('Estado restaurado'); }
            catch { showError('Error al deshacer'); }
            finally { setIsUndoing(false); }
          },
        });
      } else {
        showInfo('Tarea reabierta');
      }
    } catch (error) {
      showError(`Error al actualizar: ${error.message}`);
    }
  }, [currentUser, isUndoing, showError, showInfo, showNotification, showWarning]);

  const changeTaskStatus = useCallback(async (taskId, newStatus) => {
    const labels = { pendiente: 'Pendiente', en_proceso: 'En Proceso', en_revision: 'En Revisión', cerrada: 'Completada' };
    try {
      const task = tasks.find(t => t.id === taskId);
      const previousStatus = task?.status;
      const perm = canChangeTaskStatus(currentUser, task, newStatus);
      if (!perm.canChange) { showWarning(perm.reason || 'Sin permisos'); return; }

      hapticMedium();
      await updateTask(taskId, { status: newStatus });
      if (newStatus === 'cerrada') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        hapticHeavy();
      }
      showNotification({
        message: `Estado: ${labels[newStatus]} · Toca para deshacer`,
        type: 'success',
        duration: 5000,
        onPress: previousStatus ? async () => {
          if (isUndoing) return;
          setIsUndoing(true);
          try { await updateTask(taskId, { status: previousStatus }); showInfo(`Estado restaurado: ${labels[previousStatus] || previousStatus}`); }
          catch { showError('Error al deshacer'); }
          finally { setIsUndoing(false); }
        } : undefined,
      });
    } catch (error) {
      showError(`Error: ${error.message}`);
    }
  }, [showNotification, showInfo, showError, showWarning, tasks, isUndoing, currentUser]);

  const reopenTask = useCallback(async (task) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showWarning('Solo los administradores pueden reabrir tareas');
      return;
    }
    try {
      hapticMedium();
      await updateTask(task.id, { status: 'pendiente' });
      showSuccess('Tarea reabierta');
    } catch (error) {
      showError(`Error al reabrir: ${error.message}`);
    }
  }, [currentUser, showWarning, showSuccess, showError]);

  const duplicateTask = useCallback((task) => {
    hapticMedium();
    navigation.navigate('TaskDetail', {
      task: {
        title: `${task.title} (copia)`,
        description: task.description || '',
        status: 'pendiente',
        priority: task.priority || 'media',
        area: task.area || '',
        areas: task.areas || [],
        department: task.department || '',
        assignedTo: task.assignedTo || '',
        dueAt: task.dueAt || Date.now(),
        tags: task.tags || [],
      },
    });
    showInfo('Editando copia de la tarea');
  }, [navigation, showInfo]);

  const shareTask = useCallback(async (task) => {
    hapticLight();
    const assigned = Array.isArray(task.assignedTo)
      ? task.assignedTo.join(', ')
      : (task.assignedTo || 'Sin asignar');
    const text = `Tarea: ${task.title}\nVence: ${new Date(toMs(task.dueAt)).toLocaleDateString()}\nAsignado: ${assigned}\nÁrea: ${task.area || 'Sin área'}\nPrioridad: ${task.priority || 'media'}\nEstado: ${task.status || 'pendiente'}`;
    try {
      await Clipboard.setStringAsync(text);
      showSuccess('Tarea copiada al portapapeles');
    } catch { showError('Error al copiar'); }
  }, [showSuccess, showError]);

  const renderRightActions = useCallback((progress, dragX, task) => {
    const trans = dragX.interpolate({ inputRange: [-100, 0], outputRange: [0, 100], extrapolate: 'clamp' });
    return (
      <Animated.View style={{ transform: [{ translateX: trans }], flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => deleteTask(task.id)}
          style={{ backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 16 }}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 3, fontWeight: '600' }}>Eliminar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [deleteTask, theme.error]);

  // Memos
  const statusCounts = useMemo(() => ({
    todas: tasks.length,
    ...countByStatus(tasks),
  }), [tasks]);

  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (!matchesStatusFilter(task.status, quickStatusFilter)) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchAssigned = Array.isArray(task.assignedTo)
        ? task.assignedTo.some(a => a?.toLowerCase().includes(q))
        : task.assignedTo?.toLowerCase().includes(q);
      const matchTags = task.tags?.some(tag => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchAssigned && !matchTags) return false;
    }
    return true;
  }), [tasks, searchText, quickStatusFilter]);

  const keyExtractor = useCallback((item) => item.id, []);
  const handleSearch = useCallback((text) => setSearchText(text), []);

  const styles = useMemo(
    () => createStyles(theme, isDark, isDesktop, width, padding),
    [theme, isDark, isDesktop, width, padding]
  );

  // Loading state — skeletons en vez de spinner
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.loadingGradient}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <View style={{ gap: 8 }}>
              <View style={{ width: 80, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)' }} />
              <View style={{ width: 130, height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.30)' }} />
            </View>
          </View>
        </LinearGradient>
        <View style={{ paddingTop: 16 }}>
          {[1, 2, 3, 4, 5].map(i => <TaskCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>

        <HomeHeader
          userName={currentUser?.displayName || 'Usuario'}
          userEmail={currentUser?.email || ''}
          role={currentUser?.role?.toUpperCase() || 'USUARIO'}
          onSearch={handleSearch}
          searchText={searchText}
          quickStatusFilter={quickStatusFilter}
          onFilterChange={setQuickStatusFilter}
          statusCounts={statusCounts}
          onProfilePress={() => navigation.navigate('Profile')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          searchRef={searchRef}
        />

        <OverdueAlert
          tasks={tasks}
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
          onTaskPress={(task) => navigation.navigate('TaskDetail', { task, taskId: task.id })}
        />

        {/* Lista de tareas */}
        <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
          <FlatList
            ref={flatListRef}
            key={isDesktop || isTablet ? 'grid-2' : 'list-1'}
            data={filteredTasks}
            keyExtractor={keyExtractor}
            numColumns={isDesktop || isTablet ? 2 : 1}
            columnWrapperStyle={isDesktop || isTablet ? { alignItems: 'flex-start' } : undefined}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
            windowSize={5}
            maxToRenderPerBatch={isDesktop || isTablet ? 10 : 5}
            removeClippedSubviews
            initialNumToRender={isDesktop || isTablet ? 14 : 8}
            updateCellsBatchingPeriod={100}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View>
              <View style={styles.listHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: theme.text }]}>
                    {quickStatusFilter === 'todas' ? 'Mis tareas' : statusLabel(quickStatusFilter)}
                  </Text>
                  <Text style={[styles.listSub, { color: theme.textSecondary }]}>
                    {filteredTasks.length === tasks.length
                      ? `${filteredTasks.length} tarea${filteredTasks.length !== 1 ? 's' : ''}`
                      : `${filteredTasks.length} de ${tasks.length} tareas`}
                  </Text>
                </View>
              </View>
              </View>
            }
            renderItem={({ item }) => {
              const card = (
                <View style={isDesktop || isTablet ? { flex: 1 } : undefined}>
                  <TaskCard
                    task={item}
                    onPress={() => { announce(`Abriendo: ${item.title}`); openDetail(item); }}
                    onLongPress={() => {
                      if (currentUser?.role === 'admin') {
                        hapticMedium();
                        if (isClosed(item.status)) reopenTask(item);
                        else toggleComplete(item);
                      }
                    }}
                  />
                </View>
              );

              if (Platform.OS === 'web' || !currentUser || currentUser.role !== 'admin') return card;

              return (
                <Swipeable
                  renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                  friction={2}
                  overshootRight={false}
                >
                  {card}
                </Swipeable>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="checkbox-outline"
                title="Sin tareas"
                message={
                  searchText || quickStatusFilter !== 'todas'
                    ? 'No hay tareas con los filtros aplicados'
                    : currentUser?.role === 'admin'
                      ? 'Aún no hay tareas. Crea la primera para asignarla a un área.'
                      : 'No tienes tareas asignadas por ahora.'
                }
                quickAction={currentUser?.role === 'admin' && !searchText && quickStatusFilter === 'todas' ? {
                  label: 'Crear tarea',
                  icon: 'add-circle-outline',
                  onPress: () => { hapticMedium(); navigation.navigate('TaskDetail', {}); },
                } : undefined}
              />
            }
          />
        </Animated.View>

        <ConfettiCelebration trigger={showConfetti} />
      </View>

      {/* Botón flotante: crear tarea (solo administrador) */}
      {currentUser?.role === 'admin' && (
        <QuickActionButton
          actions={[
            { icon: 'add-circle', label: 'Nueva tarea', color: theme.primary, onPress: () => navigation.navigate('TaskDetail', {}) },
            { icon: 'search', label: 'Buscar', color: theme.info, onPress: () => navigation.navigate('Search') },
          ]}
          position="bottom-right"
        />
      )}

      <QuickTip {...TIPS.HOME_SWIPE} position="bottom" delay={2000} />
      {currentUser && <OnboardingTour userRole={currentUser.role} />}
    </View>
  );
}

function createStyles(theme, isDark, isDesktop, width, padding) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    contentWrapper: {
      flex: 1,
      alignSelf: 'center',
      width: '100%',
    },
    loadingGradient: {
      paddingTop: Platform.OS === 'ios' ? 52 : 32,
      paddingBottom: 32,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      gap: 10,
    },
    listContent: {
      paddingBottom: 100,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    listSub: {
      fontSize: 14,
      marginTop: 2,
    },
  });
}
