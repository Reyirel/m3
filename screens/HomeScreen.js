// screens/HomeScreen.js
// Estilos → screens/kanban/HomeScreenStyles.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Animated, Platform, Modal, ScrollView, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getSwipeable } from '../utils/platformComponents';
import TaskItem from '../components/TaskItem';
import TaskCard from '../components/TaskCard'; // ✨ NEW: Glassmorphic task card for lists
import SearchBar from '../components/SearchBar';
import ThemeToggle from '../components/ThemeToggle';
import EmptyState from '../components/EmptyState';
import CompactSearchHeader from '../components/CompactSearchHeader';
import ConfettiCelebration from '../components/ConfettiCelebration';
import { PremiumGlassCard, GlassmorphicEmptyState } from '../components'; // ✨ UPGRADED: Premium Glassmorphism + Accessibility
import { useGlassPreset } from '../hooks/useGlassmorphism'; // ✨ NEW: Glassmorphism configuration
import { useNotification } from '../contexts/NotificationContext';
import { deleteManager } from '../utils/deleteManager';
import QuickActionButton from '../components/QuickActionButton';
import AmbientOrbs from '../components/AmbientOrbs';
import { PremiumSkeletonLoader, GlowEffect } from '../components';
import { toMs } from '../utils/dateUtils';
import { generateDailySummary, detectStalledTasks } from '../utils/aiFeatures';
import OverdueAlert from '../components/OverdueAlert';
import ShimmerEffect from '../components/ShimmerEffect';
import OnboardingTour from '../components/OnboardingTour';
import SyncIndicator from '../components/SyncIndicator';
import QuickTip, { TIPS } from '../components/QuickTip';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { deleteTask as deleteTaskFirebase, updateTask, createTask } from '../services/tasks';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAccessibility } from '../hooks/useAccessibility'; // ✨ NEW: Accessibility helpers
import { SPACING, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';
import { canChangeTaskStatus, canDeleteTask } from '../services/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHomeStyles } from './kanban/HomeScreenStyles';

const Swipeable = getSwipeable();

// Debug and permission testing removed for production

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError, showWarning, showInfo, showNotification } = useNotification();
  const { getTaskLabel, getTouchableProps, announce } = useAccessibility(); // ✨ NEW: Accessibility helpers

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
  }, [headerOpacity, headerSlide, searchOpacity, searchSlide, listOpacity, listSlide]);
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
  }, [tasksLoading, tasks, fadeAnim]);

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
            const { id: _id, ...taskWithoutId } = taskToDelete;
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
      .catch(_error => {
        // Si falla en Firebase, mantener marcado para evitar que reaparezca
      })
      .finally(() => {
        // ✅ LIMPIAR MARCA LOCAL DE EN PROCESO
        deletingTasksRef.current.delete(taskId);
      });
  }, [currentUser, isUndoing, tasks, setTasks, showNotification, showError, showInfo]);

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
  }, [currentUser, isUndoing, showError, showInfo, showNotification, showWarning]);

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
  }, [showNotification, showInfo, showError, showWarning, tasks, isUndoing, currentUser]);

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
  }, [showSuccess, showError]);

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
            backgroundColor: theme.error,
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

  const filterCounts = useMemo(() => {
    const c = { todas: tasks.length };
    tasks.forEach(t => {
      if (t.status === 'pendiente') c.pendiente = (c.pendiente || 0) + 1;
      if (t.status === 'en_progreso' || t.status === 'en_proceso' || t.status === 'en-progreso') c['en-progreso'] = (c['en-progreso'] || 0) + 1;
      if (t.status === 'en_revision' || t.status === 'revision') c.revision = (c.revision || 0) + 1;
      if (t.status === 'cerrada') c.cerrada = (c.cerrada || 0) + 1;
    });
    return c;
  }, [tasks]);

  // Callbacks
  const handleSearch = useCallback((text) => {
    setSearchText(text);
  }, []);



  // Create theme-aware and responsive styles
  const styles = React.useMemo(() => createHomeStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  // keyExtractor debe estar antes de cualquier early return (reglas de hooks)
  const keyExtractor = useCallback((item) => item.id, []);

  // Show shimmer loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerHighlight} />
          <View style={styles.header}>
            <View>
              <ShimmerEffect width={120} height={14} borderRadius={7} style={{ marginBottom: 6 }} />
              <ShimmerEffect width={190} height={30} borderRadius={10} />
            </View>
            <PremiumSkeletonLoader type="avatar" />
          </View>
        </LinearGradient>
        
        <View style={{ padding: 20, gap: 16 }}>
          <PremiumSkeletonLoader type="card" count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Premium Ambient Orbs - Glasmorfismo */}
      <AmbientOrbs intensity="medium" />
      
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
          <CompactSearchHeader
            userName={currentUser?.displayName || 'Usuario'}
            userEmail={currentUser?.email || 'email@example.com'}
            role={currentUser?.role?.toUpperCase() || 'USUARIO'}
            onSearch={handleSearch}
            searchText={searchText}
            quickStatusFilter={quickStatusFilter}
            onFilterChange={setQuickStatusFilter}
            statusCounts={statusCounts}
            navigation={navigation}
          />
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
            <View style={[styles.urgentModalContent, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', borderWidth: 1 }]}>
            <View style={styles.urgentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alarm" size={28} color={theme.error} style={{ marginRight: 12 }} />
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
                      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
                      borderColor: hoursLeft < 2 ? theme.error : theme.warning
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
                        color={hoursLeft < 2 ? theme.error : theme.warning} 
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
                      backgroundColor: hoursLeft < 2 ? theme.errorAlpha : theme.warningAlpha 
                    }]}>
                      <Ionicons name="hourglass" size={16} color={hoursLeft < 2 ? theme.error : theme.warning} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? theme.error : theme.warning 
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



        <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
          <FlatList
          ref={flatListRef}
          data={filteredTasks}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
              tintColor={theme.primary}
              colors={[theme.primary]}
              title={refreshing ? 'Actualizando...' : ''}
              titleColor={theme.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isLoading ? (
            <PremiumSkeletonLoader type="bento" />
          ) : (
          <View style={styles.bentoGrid}>

            {/* Section label */}
            <View style={styles.sectionLabelRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabelTitle, { color: theme.text }]}>
                  {quickStatusFilter === 'todas' ? 'Mis tareas' :
                   quickStatusFilter === 'pendiente' ? 'Pendientes' :
                   quickStatusFilter === 'en-progreso' ? 'En progreso' :
                   quickStatusFilter === 'revision' ? 'En revisión' :
                   'Cerradas'}
                </Text>
                <Text style={[styles.sectionLabelSub, { color: theme.textSecondary }]}>
                  {filteredTasks.length === tasks.length
                    ? `${filteredTasks.length} tarea${filteredTasks.length !== 1 ? 's' : ''}`
                    : `${filteredTasks.length} de ${tasks.length} tareas`}
                </Text>
              </View>
              {smartBriefing.urgentCount > 0 && (
                <View style={[styles.sectionLabelBadge, { backgroundColor: theme.warningAlpha, borderColor: theme.warning }]}>
                  <Ionicons name="time" size={11} color={theme.warning} />
                  <Text style={[styles.sectionLabelBadgeText, { color: theme.warning }]}>
                    {smartBriefing.urgentCount} urgente{smartBriefing.urgentCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
          )
        }
        renderItem={({ item, index }) => {
          // Determinar permisos según el rol
          const isAdmin = currentUser?.role === 'admin';
          const isSecretario = currentUser?.role === 'secretario';
          
          const content = (
            <TaskCard
              task={item}
              onPress={() => {
                announce(`Abriendo: ${item.title}`);
                openDetail(item);
              }}
              onLongPress={() => {
                // Long press for quick actions on mobile
                if (currentUser?.role === 'admin') {
                  hapticMedium();
                  if (item.status === 'completado') {
                    reopenTask(item);
                  } else {
                    toggleComplete(item);
                  }
                }
              }}
            />
          );

          // TaskCard already includes PremiumGlassCard wrapper internally,
          // so we don't need to wrap it again
          const wrappedContent = content;

          // En web, no usar swipe
          if (Platform.OS === 'web' || !currentUser || currentUser.role !== 'admin') {
            return wrappedContent;
          }

          // En móvil con admin, usar swipe
          return (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
              friction={2}
              overshootRight={false}
            >
              {wrappedContent}
            </Swipeable>
          );
        }}
          ListEmptyComponent={
            <GlassmorphicEmptyState
              icon="checkbox-outline"
              title="Sin tareas"
              message={searchText || quickStatusFilter !== 'todas'
                ? "No hay tareas que coincidan con los filtros aplicados"
                : "No tienes tareas pendientes. ¡Toca el botón + para crear una nueva!"
              }
              action={{
                label: 'Crear tarea',
                onPress: () => {
                  hapticMedium();
                  navigation.navigate('TaskDetail', {});
                },
              }}
              fullScreen={false}
            />
          }
        />
        </Animated.View>
        
        {/* Modal SmartBriefing compacto */}
        <Modal visible={showBriefingModal} transparent animationType="fade" onRequestClose={() => setShowBriefingModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBriefingModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.briefingModal, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: smartBriefing.overdueCount > 0 ? theme.errorAlpha : smartBriefing.urgentCount > 0 ? theme.warningAlpha : theme.successAlpha
                }}>
                  <Ionicons
                    name={smartBriefing.overdueCount > 0 ? 'warning' : smartBriefing.urgentCount > 0 ? 'time' : 'sparkles'}
                    size={20}
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
                    <Ionicons name="pause-circle" size={14} color={theme.warning} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.warning }}>Tareas estancadas ({stalledTasks.length})</Text>
                  </View>
                  {stalledTasks.map(({ task, stalledDays }) => (
                    <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                      <Ionicons name="ellipse" size={6} color={theme.warning} style={{ marginTop: 1 }} />
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
            <View style={[styles.urgentModalContent, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', borderWidth: 1 }]}>
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
        <GlowEffect size="large" color={theme.primary} intensity={0.7}>
          <QuickActionButton
            actions={[
              {
                icon: 'add-circle',
                label: 'Nueva tarea',
                color: theme.primary,
                onPress: () => navigation.navigate('TaskDetail', {}),
              },
              {
                icon: 'notifications',
                label: 'Notificaciones',
                color: theme.info,
                onPress: () => navigation.navigate('Notifications'),
              },
              {
                icon: 'stats-chart',
                label: 'Estadísticas',
                color: theme.success,
                onPress: () => navigation.navigate('ExecutiveDashboard'),
              },
            ]}
            position="bottom-right"
          />
        </GlowEffect>
      )}
      
      {/* FAB simple para otros roles - Solo ver notificaciones */}
      {currentUser && (currentUser.role === 'secretario' || currentUser.role === 'director') && (
        <GlowEffect size="medium" color={theme.info} intensity={0.6}>
          <QuickActionButton
            actions={[
              {
                icon: 'notifications',
                label: 'Notificaciones',
                color: theme.info,
                onPress: () => navigation.navigate('Notifications'),
              },
            ]}
            position="bottom-right"
          />
        </GlowEffect>
      )}
      
      {/* Loading Indicator — removed (savingProgress no longer used) */}
      
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
