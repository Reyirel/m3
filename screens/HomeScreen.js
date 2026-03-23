import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Animated, Platform, Modal, ScrollView, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getSwipeable } from '../utils/platformComponents';
import TaskItem from '../components/TaskItem';
import SearchBar from '../components/SearchBar';
import ThemeToggle from '../components/ThemeToggle';
import EmptyState from '../components/EmptyState';
import ConfettiCelebration from '../components/ConfettiCelebration';
import { useNotification } from '../contexts/NotificationContext';
import { deleteManager } from '../utils/deleteManager';
import QuickActionButton from '../components/QuickActionButton';
import { toMs } from '../utils/dateUtils';
import { generateDailySummary, detectStalledTasks } from '../utils/aiFeatures';
import ShimmerEffect from '../components/ShimmerEffect';
import SkeletonLoader from '../components/SkeletonLoader';
import OverdueAlert from '../components/OverdueAlert';
import OnboardingTour from '../components/OnboardingTour';
import LoadingIndicator from '../components/LoadingIndicator';
import SyncIndicator from '../components/SyncIndicator';
import QuickTip, { TIPS } from '../components/QuickTip';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { SPACING, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';
import { canChangeTaskStatus, canDeleteTask } from '../services/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Swipeable = getSwipeable();

// Debug and permission testing removed for production

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError, showWarning, showInfo, showNotification } = useNotification();

  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks, isLoading: tasksLoading, currentUser } = useTasks();
  const isLoading = tasksLoading; // Derivado directo, sin estado duplicado
  const [searchText, setSearchText] = useState('');
  const [quickStatusFilter, setQuickStatusFilter] = useState('todas'); // 'todas', 'pendiente', 'en-progreso', 'revision', 'cerrada'
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  // 💾 Cargar búsqueda guardada — clave por usuario para evitar contaminación entre sesiones
  useEffect(() => {
    if (!currentUser?.email) return;
    const userKey = currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const loadSavedSearch = async () => {
      try {
        const savedSearch = await AsyncStorage.getItem(`@home_search_${userKey}`);
        if (savedSearch) setSearchText(savedSearch);
      } catch (error) {
        // Ignorar errores de carga
      }
    };
    loadSavedSearch();
  }, [currentUser?.email]);

  // 💾 Guardar búsqueda cuando cambia — clave por usuario
  useEffect(() => {
    if (!currentUser?.email) return;
    const userKey = currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AsyncStorage.setItem(`@home_search_${userKey}`, searchText).catch(() => {});
  }, [searchText, currentUser?.email]);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchSlide = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(30)).current;

  // Stagger animations on mount
  useEffect(() => {
    const staggerDelay = 35;

    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Search bar animation
    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(searchSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay);

    // List animation
    const t2 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(listSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay * 2);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const deletingTasksRef = useRef(new Set());


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium(); // Haptic feedback on pull-to-refresh
    // Las tareas se actualizan automáticamente por el listener
    // Solo simulamos el tiempo de refresco
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Animar lista y detectar urgentes cuando cargan las tareas
  useEffect(() => {
    if (!tasksLoading && tasks.length > 0) {
      // Animar entrada
      if (fadeAnim._value !== 1) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
      // Detectar tareas urgentes y mostrar modal (solo la primera vez)
      if (fadeAnim._value === 0) {
        setTimeout(() => {
          const now = Date.now();
          const sixHours = 6 * 60 * 60 * 1000;
          const urgent = tasks.filter(task => {
            if (task.status === 'cerrada') return false;
            const due = toMs(task.dueAt);
            const timeLeft = due - now;
            return timeLeft > 0 && timeLeft < sixHours;
          });
          if (urgent.length > 0) {
            setShowUrgentModal(true);
          }
        }, 1200);
      }
    }
  }, [tasksLoading]);

  const openDetail = useCallback((task) => {
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);

  const deleteTask = useCallback((taskId) => {
    // 🛡️ GUARD: Prevenir eliminación múltiple del mismo task
    if (deletingTasksRef.current.has(taskId)) {
      return;
    }
    
    // Verificar permisos usando el nuevo sistema
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      showError('Tarea no encontrada');
      return;
    }

    const deletePermission = canDeleteTask(currentUser, taskToDelete);
    if (!deletePermission.canDelete) {
      showError(deletePermission.reason);
      return;
    }

    // ✅ MARCAR COMO EN PROCESO (local + context global)
    deletingTasksRef.current.add(taskId);
    deleteManager.markDeleting(taskId);  // 🛡️ Evitar que el listener restaure la tarea
    hapticHeavy();

    // 🚀 FASE 1: ELIMINAR DE LA UI INMEDIATAMENTE (optimistic update)
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));

    // ✅ MOSTRAR TOAST DE ÉXITO AL INSTANTE (toca para deshacer)
    showNotification({
      message: 'Tarea eliminada · Toca para deshacer',
      type: 'success',
      duration: 8000,
      onPress: async () => {
        if (isUndoing) return;
        setIsUndoing(true);
        try {
          // 🛡️ Desmarcar para permitir que el listener restaure
          deleteManager.cancelDelete(taskId);
          deletingTasksRef.current.delete(taskId);
          if (taskToDelete) {
            const { id, ...taskWithoutId } = taskToDelete;
            await createTask(taskWithoutId);
            showInfo('Tarea restaurada');
          }
        } catch (error) {
          showError('Error al restaurar');
        } finally {
          setIsUndoing(false);
        }
      }
    });

    // 🔄 FASE 2: EJECUTAR DELETE EN FIREBASE EN BACKGROUND (fire-and-forget)
    deleteTaskFirebase(taskId)
      .then(() => {
        // ✅ Solo desmarcar después de éxito confirmado
        deleteManager.confirmDelete(taskId);
      })
      .catch(error => {
        // Si falla en Firebase, mantener marcado para evitar que reaparezca
      })
      .finally(() => {
        // ✅ LIMPIAR MARCA LOCAL DE EN PROCESO
        deletingTasksRef.current.delete(taskId);
      });
  }, [currentUser, isUndoing, tasks, showNotification, showError, showInfo]);

  const toggleComplete = useCallback(async (task) => {
    try {
      const previousStatus = task.status;
      const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';

      // Verificar permisos usando el nuevo sistema (valida el newStatus específico)
      const statusPermission = canChangeTaskStatus(currentUser, task, newStatus);
      if (!statusPermission.canChange) {
        showWarning(statusPermission.reason || 'No tienes permisos para este cambio');
        return;
      }

      hapticMedium(); // Haptic feedback on toggle
      await updateTask(task.id, { status: newStatus });

      // Show toast with feedback + undo
      if (newStatus === 'cerrada') {
        // Confetti para tareas urgentes completadas
        if (task.priority === 'alta') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          hapticHeavy(); // Extra haptic for urgent tasks
        }
        showNotification({
          message: 'Tarea completada · Toca para deshacer',
          type: 'success',
          duration: 5000,
          onPress: async () => {
            if (isUndoing) return;
            setIsUndoing(true);
            try {
              await updateTask(task.id, { status: previousStatus });
              showInfo('↩️ Estado restaurado');
            } catch {
              showError('Error al deshacer');
            } finally {
              setIsUndoing(false);
            }
          },
        });
      } else {
        showInfo('Tarea reabierta');
      }
    } catch (error) {
      showError(`Error al actualizar: ${error.message}`);
    }
    // La actualización del estado se hace automáticamente por el listener
  }, [currentUser, isUndoing]);

  const changeTaskStatus = useCallback(async (taskId, newStatus) => {
    const statusLabels = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'en_revision': 'En Revisión',
      'cerrada': 'Completada'
    };
    try {
      const task = tasks.find(t => t.id === taskId);
      const previousStatus = task?.status;

      // Verificar permisos antes de cambiar estado
      const permCheck = canChangeTaskStatus(currentUser, task, newStatus);
      if (!permCheck.canChange) {
        showWarning(permCheck.reason || 'No tienes permisos para este cambio');
        return;
      }

      hapticMedium();
      await updateTask(taskId, { status: newStatus });

      // Confetti si se completa
      if (newStatus === 'cerrada') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        hapticHeavy();
      }

      showNotification({
        message: `Estado: ${statusLabels[newStatus]} · Toca para deshacer`,
        type: 'success',
        duration: 5000,
        onPress: previousStatus ? async () => {
          if (isUndoing) return;
          setIsUndoing(true);
          try {
            await updateTask(taskId, { status: previousStatus });
            showInfo(`↩️ Estado restaurado: ${statusLabels[previousStatus] || previousStatus}`);
          } catch {
            showError('Error al deshacer');
          } finally {
            setIsUndoing(false);
          }
        } : undefined,
      });
    } catch (error) {
      showError(`Error: ${error.message}`);
    }
  }, [showNotification, showInfo, showError, tasks, isUndoing]);

  const reopenTask = useCallback(async (task) => {
    // Solo admin puede reabrir
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
    // No pasar id para que TaskDetailScreen lo trate como tarea nueva
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
      }
    });
    showInfo('Editando copia de la tarea');
  }, [navigation, showInfo]);

  const shareTask = useCallback(async (task) => {
    hapticLight();
    const assigned = Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : (task.assignedTo || 'Sin asignar');
    const shareText = `Tarea: ${task.title}\nVence: ${new Date(toMs(task.dueAt)).toLocaleDateString()}\nAsignado: ${assigned}\nÁrea: ${task.area || 'Sin área'}\nPrioridad: ${task.priority || 'media'}\nEstado: ${task.status || 'pendiente'}`;
    
    try {
      await Clipboard.setStringAsync(shareText);
      showSuccess('Tarea copiada al portapapeles');
    } catch (error) {
      showError('Error al copiar');
    }
  }, []);

  // Renderizar acción de deslizar para eliminar
  const renderRightActions = useCallback((progress, dragX, task) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          transform: [{ translateX: trans }],
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => deleteTask(task.id, true)}
          style={{
            backgroundColor: '#FF3B30',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Eliminar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [deleteTask]);

  // Calcular tareas urgentes (vencen en menos de 48 horas)
  const urgentTasks = useMemo(() => {
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return tasks.filter(task => {
      if (task.status === 'cerrada') return false;
      const dueDate = task.dueAt;
      const timeUntilDue = dueDate - now;
      return timeUntilDue > 0 && timeUntilDue <= fortyEightHours;
    });
  }, [tasks]);

  // IA Feature 1: Resumen inteligente del día
  const smartBriefing = useMemo(
    () => generateDailySummary(tasks, currentUser),
    [tasks, currentUser]
  );

  // Feature 7: tareas estancadas (en_proceso sin movimiento 5+ días)
  const stalledTasks = useMemo(
    () => detectStalledTasks(tasks, 5).slice(0, 3),
    [tasks]
  );

  // Conteo por estado para chips de filtro rápido
  const statusCounts = useMemo(() => ({
    todas: tasks.length,
    pendiente: tasks.filter(t => t.status === 'pendiente').length,
    'en-progreso': tasks.filter(t => t.status === 'en_proceso').length,
    revision: tasks.filter(t => t.status === 'en_revision' || t.status === 'revision').length,
    cerrada: tasks.filter(t => t.status === 'cerrada').length,
  }), [tasks]);

  // Aplicar filtros con memoización
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Quick status filter (chips rápidos)
      if (quickStatusFilter !== 'todas') {
        if (quickStatusFilter === 'en-progreso' && task.status !== 'en_progreso' && task.status !== 'en_proceso' && task.status !== 'en-progreso') return false;
        if (quickStatusFilter === 'revision' && task.status !== 'en_revision' && task.status !== 'revision') return false;
        if (quickStatusFilter === 'pendiente' && task.status !== 'pendiente') return false;
        if (quickStatusFilter === 'cerrada' && task.status !== 'cerrada') return false;
      }

      // Search text filter (title, description, assignedTo, tags)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(search);
        const matchDescription = task.description?.toLowerCase().includes(search);
        
        // Handle assignedTo - can be array or string
        let matchAssigned = false;
        if (Array.isArray(task.assignedTo)) {
          matchAssigned = task.assignedTo.some(a => a?.toLowerCase().includes(search));
        } else if (typeof task.assignedTo === 'string') {
          matchAssigned = task.assignedTo.toLowerCase().includes(search);
        }
        
        const matchTags = task.tags?.some(tag => tag.toLowerCase().includes(search));
        if (!matchTitle && !matchDescription && !matchAssigned && !matchTags) return false;
      }
      
      return true;
    });
  }, [tasks, searchText, quickStatusFilter]);


  // Callbacks
  const handleSearch = useCallback((text) => {
    setSearchText(text);
  }, []);



  // Create theme-aware and responsive styles
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  // Show shimmer loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <ShimmerEffect width={150} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
              <ShimmerEffect width={200} height={32} borderRadius={10} />
            </View>
            <ShimmerEffect width={56} height={56} borderRadius={28} />
          </View>
        </LinearGradient>
        
        <View style={{ padding: 20, gap: 16 }}>
          <SkeletonLoader type="card" count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
          <LinearGradient
            colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>Mis Tareas</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => { hapticLight(); setShowBriefingModal(true); }}
                >
                  <Ionicons
                    name={smartBriefing.overdueCount > 0 ? 'warning-outline' : smartBriefing.urgentCount > 0 ? 'time-outline' : 'sparkles-outline'}
                    size={22}
                    color={smartBriefing.overdueCount > 0 ? '#FCA5A5' : smartBriefing.urgentCount > 0 ? '#FCD34D' : '#FFFFFF'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => { hapticLight(); setShowHelpModal(true); }}
                >
                  <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <ThemeToggle size={22} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Banner de tareas vencidas / urgentes */}
        <OverdueAlert
          tasks={tasks}
          currentUserEmail={currentUser?.email}
          role={currentUser?.role}
          onTaskPress={(task) => navigation.navigate('TaskDetail', { task })}
        />

        {/* Modal de Tareas Urgentes */}
        <Modal
          visible={showUrgentModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowUrgentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.urgentModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.urgentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alarm" size={28} color="#FF3B30" style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.urgentModalTitle, { color: theme.text }]}>¡Tareas Urgentes!</Text>
                  <Text style={[styles.urgentModalSubtitle, { color: theme.textSecondary }]}>
                    Vencen en menos de 6 horas
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.urgentModalScroll}>
              {urgentTasks.filter(task => {
                const timeLeft = toMs(task.dueAt) - Date.now();
                return timeLeft < 6 * 60 * 60 * 1000; // Menos de 6 horas
              }).map((task) => {
                const timeLeft = toMs(task.dueAt) - Date.now();
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.urgentTaskCard, { 
                      backgroundColor: theme.surface,
                      borderColor: hoursLeft < 2 ? '#FF3B30' : '#FF9500'
                    }]}
                    onPress={() => {
                      setShowUrgentModal(false);
                      navigation.navigate('TaskDetail', { task });
                    }}
                  >
                    <View style={styles.urgentTaskHeader}>
                      <Ionicons 
                        name={hoursLeft < 2 ? "alert-circle" : "time"} 
                        size={24} 
                        color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} 
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.urgentTaskTitle, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                          {task.area} • {Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : (task.assignedTo || 'Sin asignar')}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.urgentTaskTimer, { 
                      backgroundColor: hoursLeft < 2 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 149, 0, 0.1)' 
                    }]}>
                      <Ionicons name="hourglass" size={16} color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? '#FF3B30' : '#FF9500' 
                      }]}>
                        {hoursLeft}h {minutesLeft}m restantes
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.urgentModalFooter}>
              <TouchableOpacity 
                style={[styles.urgentModalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowUrgentModal(false)}
              >
                <Text style={styles.urgentModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </Modal>

        {/* Search Bar */}
        <Animated.View style={{ 
          opacity: searchOpacity, 
          transform: [{ translateY: searchSlide }],
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
        }}>
          <View style={[
            styles.searchBarContainer,
            {
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <SearchBar onSearch={handleSearch} placeholder="Buscar tareas..." />
          </View>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
          <FlatList
          ref={flatListRef}
          data={filteredTasks}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          initialNumToRender={8}
          updateCellsBatchingPeriod={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
              title={refreshing ? 'Actualizando...' : ''}
              titleColor="#007AFF"
            />
          }
          contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isLoading ? (
            <SkeletonLoader type="bento" />
          ) : (
          <View style={styles.bentoGrid}>

            {/* Chips de filtro rápido por estado */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.quickFiltersScroll}
              contentContainerStyle={styles.quickFiltersContent}
            >
              {[
                { key: 'todas', label: 'Todas', icon: 'apps' },
                { key: 'pendiente', label: 'Pendiente', icon: 'time-outline' },
                { key: 'en-progreso', label: 'En progreso', icon: 'play-circle' },
                { key: 'revision', label: 'Revisión', icon: 'eye' },
                { key: 'cerrada', label: 'Cerradas', icon: 'checkmark-circle' },
              ].map(filter => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.quickFilterChip,
                    {
                      backgroundColor: quickStatusFilter === filter.key
                        ? theme.primary
                        : (isDark ? '#2a2a2a' : '#f0f0f0'),
                      borderColor: quickStatusFilter === filter.key
                        ? theme.primary
                        : (isDark ? '#444' : '#ddd'),
                    }
                  ]}
                  onPress={() => {
                    hapticLight();
                    setQuickStatusFilter(filter.key);
                  }}
                  accessibilityLabel={`Filtrar por ${filter.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: quickStatusFilter === filter.key }}
                >
                  <Ionicons 
                    name={filter.icon} 
                    size={14} 
                    color={quickStatusFilter === filter.key ? '#fff' : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.quickFilterLabel,
                    { color: quickStatusFilter === filter.key ? '#fff' : theme.text }
                  ]}>
                    {filter.label}
                  </Text>
                  <View style={[
                    styles.quickFilterBadge,
                    { backgroundColor: quickStatusFilter === filter.key ? 'rgba(255,255,255,0.3)' : (isDark ? '#444' : '#ddd') }
                  ]}>
                    <Text style={[
                      styles.quickFilterBadgeText,
                      { color: quickStatusFilter === filter.key ? '#fff' : theme.textSecondary }
                    ]}>
                      {statusCounts[filter.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          )
        }
        renderItem={({ item, index }) => {
          // Determinar permisos según el rol
          const isAdmin = currentUser?.role === 'admin';
          const isSecretario = currentUser?.role === 'secretario';
          
          const content = (
            <TaskItem 
              task={item}
              index={index}
              compact={false}
              onPress={() => openDetail(item)} // 👈 Abre detalle de tarea consistente con otras pantallas
              // Solo admin puede eliminar tareas
              onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
              onToggleComplete={() => toggleComplete(item)}
              // Solo admin puede reabrir tareas
              onReopen={isAdmin ? reopenTask : undefined}
              // Solo admin y secretario pueden duplicar tareas
              onDuplicate={isAdmin || isSecretario ? () => duplicateTask(item) : undefined}
              onShare={() => shareTask(item)}
              onChangeStatus={(task, newStatus) => changeTaskStatus(task.id, newStatus)}
              currentUserRole={currentUser?.role || 'director'}
            />
          );

          // En web, no usar swipe
          if (Platform.OS === 'web' || !currentUser || currentUser.role !== 'admin') {
            return content;
          }

          // En móvil con admin, usar swipe
          return (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
              friction={2}
              overshootRight={false}
            >
              {content}
            </Swipeable>
          );
        }}
          ListEmptyComponent={
            <EmptyState
              icon="checkbox-outline"
              title="Sin tareas"
              message={searchText || quickStatusFilter !== 'todas'
                ? "No hay tareas que coincidan con los filtros aplicados"
                : "No tienes tareas pendientes. ¡Toca el botón + para crear una nueva!"
              }
            />
          }
        />
        </Animated.View>
        
        {/* Modal SmartBriefing compacto */}
        <Modal visible={showBriefingModal} transparent animationType="fade" onRequestClose={() => setShowBriefingModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBriefingModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.briefingModal, { backgroundColor: theme.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: smartBriefing.overdueCount > 0 ? '#EF444420' : smartBriefing.urgentCount > 0 ? '#F59E0B20' : '#10B98120'
                }}>
                  <Ionicons
                    name={smartBriefing.overdueCount > 0 ? 'warning' : smartBriefing.urgentCount > 0 ? 'time' : 'sparkles'}
                    size={20}
                    color={smartBriefing.overdueCount > 0 ? '#EF4444' : smartBriefing.urgentCount > 0 ? '#F59E0B' : '#10B981'}
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
                    <Ionicons name="pause-circle" size={14} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>Tareas estancadas ({stalledTasks.length})</Text>
                  </View>
                  {stalledTasks.map(({ task, stalledDays }) => (
                    <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                      <Ionicons name="ellipse" size={6} color="#F59E0B" style={{ marginTop: 1 }} />
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

        {/* Modal de Ayuda */}
        <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.urgentModalContent, { backgroundColor: theme.card }]}>
              <View style={[styles.urgentModalHeader, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="help-circle" size={28} color={theme.primary} />
                  <View>
                    <Text style={[styles.urgentModalTitle, { color: theme.text }]}>Guía de Inicio</Text>
                    <Text style={[styles.urgentModalSubtitle, { color: theme.textSecondary }]}>Cómo usar la pantalla principal</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {[
                  { icon: 'sparkles', color: '#6366F1', title: 'Resumen IA del día', desc: 'El card de colores en la parte superior analiza tus tareas y te da un briefing inmediato. Tócalo para ocultarlo.' },
                  { icon: 'apps', color: theme.primary, title: 'Filtros de estado', desc: 'Los chips Pendiente / En progreso / Revisión / Cerradas filtran la lista al instante.' },
                  { icon: 'search', color: '#3B82F6', title: 'Búsqueda', desc: 'Escribe en la barra para buscar por título, descripción, responsable o etiqueta.' },
                  { icon: 'warning', color: '#F59E0B', title: 'Riesgo de retraso (IA)', desc: 'Las tareas con badge naranja o rojo tienen mayor probabilidad de retrasarse según patrones históricos.' },
                  { icon: 'hand-left', color: '#10B981', title: 'Swipe / Arrastrar', desc: 'En móvil arrastra una tarea hacia la izquierda para opciones rápidas (editar, borrar, duplicar).' },
                  { icon: 'add-circle', color: theme.primary, title: 'Crear tarea (Admin)', desc: 'Usa el botón flotante (+) en la esquina inferior derecha para crear nueva tarea, ver notificaciones o estadísticas.' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: theme.border }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: item.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 }}>{item.title}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.urgentModalButton, { backgroundColor: theme.primary, marginTop: 16 }]}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.urgentModalButtonText}>¡Entendido!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Confetti celebration */}
        <ConfettiCelebration trigger={showConfetti} />
        
        {/* Sync Indicator */}
        <SyncIndicator />
      </View>
      
      
      {/* FAB con acciones rápidas - Admin */}
      {currentUser && (currentUser.role === 'admin') && (
        <QuickActionButton
          actions={[
            {
              icon: 'add-circle',
              label: 'Nueva tarea',
              color: theme.primary,
              onPress: () => navigation.navigate('TaskDetail'),
            },
            {
              icon: 'notifications',
              label: 'Notificaciones',
              color: '#2196F3',
              onPress: () => navigation.navigate('Notifications'),
            },
            {
              icon: 'stats-chart',
              label: 'Estadísticas',
              color: '#4CAF50',
              onPress: () => navigation.navigate('ExecutiveDashboard'),
            },
          ]}
          position="bottom-right"
        />
      )}
      
      {/* FAB simple para otros roles - Solo ver notificaciones */}
      {currentUser && (currentUser.role === 'secretario' || currentUser.role === 'director') && (
        <QuickActionButton
          actions={[
            {
              icon: 'notifications',
              label: 'Notificaciones',
              color: '#2196F3',
              onPress: () => navigation.navigate('Notifications'),
            },
          ]}
          position="bottom-right"
        />
      )}
      
      {/* Loading Indicator — removed (savingProgress no longer used) */}
      {false && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12
          }}>
            <LoadingIndicator type="spinner" color={theme.primary} size={12} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              Guardando...
            </Text>
          </View>
        </View>
      )}
      
      {/* Tip de ayuda para usuarios nuevos */}
      <QuickTip
        {...TIPS.HOME_SWIPE}
        position="bottom"
        delay={2000}
      />

      {/* Tour de onboarding — se muestra solo la primera vez por rol */}
      {currentUser && (
        <OnboardingTour userRole={currentUser.role} />
      )}
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%'
  },
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxl : 44,
    paddingBottom: 18
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  heading: { 
    fontSize: 32, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    marginRight: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  urgentBadgeText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  urgentAlert: {
    marginHorizontal: padding,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    ...SHADOWS.sm
  },
  urgentAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgentAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  urgentAlertText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12
  },
  addButtonGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  listContent: {
    padding: padding,
    paddingTop: SPACING.sm,
    paddingBottom: 80
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: padding * 2
  },
  emptyText: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 12,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  // Bento Grid Styles
  bentoGrid: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingHorizontal: padding
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  bentoCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
    width: isDesktop ? (screenWidth > 1440 ? '23%' : '32%') : isTablet ? '48%' : '100%',
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.15,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  },
  bentoLarge: {
    flex: 2,
    minHeight: 180
  },
  bentoMedium: {
    flex: 1,
    minHeight: 180
  },
  bentoSmall: {
    flex: 1,
    minHeight: 140
  },
  bentoWide: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 16,
    minHeight: 100,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.15 : 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  bentoGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-start'
  },
  bentoGradientSmall: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  bentoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoIconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoContent: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  bentoTitleLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3
  },
  bentoTitleSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoNumberLarge: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3.2,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  bentoNumberMedium: {
    fontSize: 58,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoNumberSmall: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  bentoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 12,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: '100%',
    flexShrink: 1
  },
  areaName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 0.2,
    flex: 1,
    flexShrink: 1
  },
  areaBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center'
  },
  areaCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  // Estilos para la alerta información
  infoAlert: {
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.md,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  infoAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  infoAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  infoAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    letterSpacing: -0.3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingTop: 12,
    paddingHorizontal: 4,
    gap: 10,
    borderTopWidth: 1,
  },
  sectionIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  taskCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBarContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 104,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  urgentModalContent: {
    width: '100%',
    maxWidth: MAX_WIDTHS.modal,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    ...SHADOWS.xl
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  urgentModalSubtitle: {
    fontSize: 14,
    fontWeight: '500'
  },
  urgentModalScroll: {
    padding: 20
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  urgentTaskArea: {
    fontSize: 13,
    fontWeight: '500'
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6
  },
  urgentTaskTime: {
    fontSize: 14,
    fontWeight: '700'
  },
  urgentModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)'
  },
  urgentModalButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  // Estilos para filtros rápidos
  compactToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  quickFiltersScroll: {
    marginTop: 8,
    marginBottom: 12,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickFilterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickFilterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // IA Feature 1: SmartBriefing
  briefingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  briefingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  briefingHeadline: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 19,
  },
  briefingDetail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  briefingModal: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});
