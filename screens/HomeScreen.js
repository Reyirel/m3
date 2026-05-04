import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Platform, Modal, ScrollView,
  Easing, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getSwipeable } from '../utils/platformComponents';

import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import ConfettiCelebration from '../components/ConfettiCelebration';
import HomeHeader from '../components/ui/HomeHeader';
import OverdueAlert from '../components/OverdueAlert';
import SyncIndicator from '../components/SyncIndicator';
import QuickTip, { TIPS } from '../components/QuickTip';
import OnboardingTour from '../components/OnboardingTour';
import QuickActionButton from '../components/QuickActionButton';

import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { useAccessibility } from '../hooks/useAccessibility';

import { deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { canChangeTaskStatus, canDeleteTask } from '../services/permissions';
import { toMs } from '../utils/dateUtils';
import { generateDailySummary, detectStalledTasks } from '../utils/aiFeatures';
import { deleteManager } from '../utils/deleteManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_WIDTHS } from '../theme/tokens';

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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
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
      if (fadeAnim._value === 0) {
        setTimeout(() => {
          const now = Date.now();
          const urgent = tasks.filter(t => {
            if (t.status === 'cerrada') return false;
            const timeLeft = toMs(t.dueAt) - now;
            return timeLeft > 0 && timeLeft < 6 * 60 * 60 * 1000;
          });
          if (urgent.length > 0) setShowUrgentModal(true);
        }, 1200);
      }
    }
  }, [tasksLoading, tasks, fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task });
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
          const { id: _id, ...taskWithoutId } = taskToDelete;
          await createTask(taskWithoutId);
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
          style={{ backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 14 }}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 11, marginTop: 3, fontWeight: '600' }}>Eliminar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [deleteTask, theme.error]);

  // Memos
  const urgentTasks = useMemo(() => {
    const now = Date.now();
    return tasks.filter(t => {
      if (t.status === 'cerrada') return false;
      const timeLeft = toMs(t.dueAt) - now;
      return timeLeft > 0 && timeLeft <= 48 * 60 * 60 * 1000;
    });
  }, [tasks]);

  const smartBriefing = useMemo(() => generateDailySummary(tasks, currentUser), [tasks, currentUser]);
  const stalledTasks = useMemo(() => detectStalledTasks(tasks, 5).slice(0, 3), [tasks]);

  const statusCounts = useMemo(() => ({
    todas: tasks.length,
    pendiente: tasks.filter(t => t.status === 'pendiente').length,
    'en-progreso': tasks.filter(t => ['en_proceso', 'en_progreso', 'en-progreso'].includes(t.status)).length,
    revision: tasks.filter(t => ['en_revision', 'revision'].includes(t.status)).length,
    cerrada: tasks.filter(t => t.status === 'cerrada').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (quickStatusFilter !== 'todas') {
      if (quickStatusFilter === 'en-progreso' && !['en_progreso', 'en_proceso', 'en-progreso'].includes(task.status)) return false;
      if (quickStatusFilter === 'revision' && !['en_revision', 'revision'].includes(task.status)) return false;
      if (quickStatusFilter === 'pendiente' && task.status !== 'pendiente') return false;
      if (quickStatusFilter === 'cerrada' && task.status !== 'cerrada') return false;
    }
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

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingLine1} />
          <View style={styles.loadingLine2} />
        </LinearGradient>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.primary} />
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
          onLogout={onLogout}
        />

        <OverdueAlert
          tasks={tasks}
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
          onTaskPress={(task) => navigation.navigate('TaskDetail', { task })}
        />

        {/* Modal: tareas urgentes */}
        <Modal
          visible={showUrgentModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowUrgentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : '#FFFFFF', borderColor: theme.glassBorder }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alarm" size={24} color={theme.error} style={{ marginRight: 10 }} />
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Tareas Urgentes</Text>
                    <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Vencen en menos de 6 horas</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                  <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 280 }}>
                {urgentTasks
                  .filter(t => toMs(t.dueAt) - Date.now() < 6 * 60 * 60 * 1000)
                  .map(task => {
                    const timeLeft = toMs(task.dueAt) - Date.now();
                    const h = Math.floor(timeLeft / (1000 * 60 * 60));
                    const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[styles.urgentRow, { backgroundColor: theme.glass, borderColor: h < 2 ? theme.error : theme.warning }]}
                        onPress={() => { setShowUrgentModal(false); navigation.navigate('TaskDetail', { task }); }}
                      >
                        <Ionicons
                          name={h < 2 ? 'alert-circle' : 'time'}
                          size={20}
                          color={h < 2 ? theme.error : theme.warning}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.urgentTitle, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {task.area} · {h}h {m}m restantes
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowUrgentModal(false)}
              >
                <Text style={styles.modalBtnText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Lista de tareas */}
        <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
          <FlatList
            ref={flatListRef}
            data={filteredTasks}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
            windowSize={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews
            initialNumToRender={8}
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
              <View style={styles.listHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: theme.text }]}>
                    {quickStatusFilter === 'todas' ? 'Mis tareas'
                      : quickStatusFilter === 'pendiente' ? 'Pendientes'
                      : quickStatusFilter === 'en-progreso' ? 'En progreso'
                      : quickStatusFilter === 'revision' ? 'En revisión'
                      : 'Cerradas'}
                  </Text>
                  <Text style={[styles.listSub, { color: theme.textSecondary }]}>
                    {filteredTasks.length === tasks.length
                      ? `${filteredTasks.length} tarea${filteredTasks.length !== 1 ? 's' : ''}`
                      : `${filteredTasks.length} de ${tasks.length} tareas`}
                  </Text>
                </View>
                {smartBriefing.urgentCount > 0 && (
                  <View style={[styles.urgentBadge, { backgroundColor: theme.warningAlpha, borderColor: theme.warning }]}>
                    <Ionicons name="time" size={11} color={theme.warning} />
                    <Text style={[styles.urgentBadgeText, { color: theme.warning }]}>
                      {smartBriefing.urgentCount} urgente{smartBriefing.urgentCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const card = (
                <TaskCard
                  task={item}
                  onPress={() => { announce(`Abriendo: ${item.title}`); openDetail(item); }}
                  onLongPress={() => {
                    if (currentUser?.role === 'admin') {
                      hapticMedium();
                      if (item.status === 'completado') reopenTask(item);
                      else toggleComplete(item);
                    }
                  }}
                />
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
                    : 'No tienes tareas pendientes. Toca + para crear una nueva.'
                }
                quickAction={{
                  label: 'Crear tarea',
                  icon: 'add-circle-outline',
                  onPress: () => { hapticMedium(); navigation.navigate('TaskDetail', {}); },
                }}
              />
            }
          />
        </Animated.View>

        {/* Modal: briefing */}
        <Modal
          visible={showBriefingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBriefingModal(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBriefingModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : '#FFFFFF', borderColor: theme.glassBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: smartBriefing.overdueCount > 0 ? theme.errorAlpha : smartBriefing.urgentCount > 0 ? theme.warningAlpha : theme.successAlpha,
                }}>
                  <Ionicons
                    name={smartBriefing.overdueCount > 0 ? 'warning' : smartBriefing.urgentCount > 0 ? 'time' : 'sparkles'}
                    size={18}
                    color={smartBriefing.overdueCount > 0 ? theme.error : smartBriefing.urgentCount > 0 ? theme.warning : theme.success}
                  />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.text }}>{smartBriefing.headline}</Text>
                <TouchableOpacity onPress={() => setShowBriefingModal(false)}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {smartBriefing.details.map((detail, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5, borderTopWidth: i === 0 ? 1 : 0, borderTopColor: theme.border }}>
                  <Ionicons name="ellipse" size={6} color={theme.textSecondary} style={{ marginTop: 5 }} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 19 }}>{detail}</Text>
                </View>
              ))}
              {stalledTasks.length > 0 && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="pause-circle" size={13} color={theme.warning} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.warning }}>
                      Tareas estancadas ({stalledTasks.length})
                    </Text>
                  </View>
                  {stalledTasks.map(({ task, stalledDays }) => (
                    <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                      <Ionicons name="ellipse" size={5} color={theme.warning} style={{ marginTop: 1 }} />
                      <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                        {task.title} · {stalledDays}d sin movimiento
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Modal: ayuda */}
        <Modal
          visible={showHelpModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : '#FFFFFF', borderColor: theme.glassBorder }]}>
              <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="help-circle" size={24} color={theme.primary} />
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Guía de Inicio</Text>
                    <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Cómo usar la pantalla principal</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {[
                  { icon: 'apps', color: theme.primary, title: 'Filtros de estado', desc: 'Los chips filtran la lista al instante.' },
                  { icon: 'search', color: theme.info, title: 'Búsqueda', desc: 'Busca por título, descripción, responsable o etiqueta.' },
                  { icon: 'warning', color: theme.warning, title: 'Tareas urgentes', desc: 'Las tareas con badge naranja vencen pronto.' },
                  { icon: 'hand-left', color: theme.success, title: 'Swipe en móvil', desc: 'Arrastra una tarea a la izquierda para eliminarla.' },
                  { icon: 'add-circle', color: theme.primary, title: 'Crear tarea', desc: 'Usa el botón + en la esquina inferior derecha.' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: theme.border }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={item.icon} size={16} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 }}>{item.title}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.modalBtnText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ConfettiCelebration trigger={showConfetti} />
        <SyncIndicator />
      </View>

      {/* FAB admin */}
      {currentUser?.role === 'admin' && (
        <QuickActionButton
          actions={[
            { icon: 'add-circle', label: 'Nueva tarea', color: theme.primary, onPress: () => navigation.navigate('TaskDetail', {}) },
            { icon: 'notifications', label: 'Notificaciones', color: theme.info, onPress: () => navigation.navigate('Notifications') },
            { icon: 'stats-chart', label: 'Estadísticas', color: theme.success, onPress: () => navigation.navigate('ExecutiveDashboard') },
          ]}
          position="bottom-right"
        />
      )}

      {/* FAB secretario / director */}
      {(currentUser?.role === 'secretario' || currentUser?.role === 'director') && (
        <QuickActionButton
          actions={[
            { icon: 'notifications', label: 'Notificaciones', color: theme.info, onPress: () => navigation.navigate('Notifications') },
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
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      gap: 10,
    },
    loadingLine1: {
      width: 90,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    loadingLine2: {
      width: 180,
      height: 26,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.28)',
    },
    loadingCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    listSub: {
      fontSize: 13,
      marginTop: 2,
    },
    urgentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
    },
    urgentBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.52)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
    },
    modalSub: {
      fontSize: 13,
      marginTop: 2,
    },
    urgentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      marginBottom: 8,
    },
    urgentTitle: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    modalBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
