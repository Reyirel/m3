// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado.
// Lógica de filtros → hooks/useKanbanFilters.js
// Estilos → screens/kanban/KanbanScreenStyles.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, Animated, Dimensions, Platform, Modal, InteractionManager, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGestureHandlerRootView } from '../utils/platformComponents';
// Temporarily disabled Animated imports that may cause issues
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   runOnJS,
// } from 'react-native-reanimated';
import ShimmerEffect from '../components/ShimmerEffect';
import SpringCard from '../components/SpringCard';
import BottomSheet from '../components/BottomSheet';
import FadeInView from '../components/FadeInView';
import { PremiumGlassCard, GlassmorphicHeader, GlassmorphicFilterChips, GlassmorphicStatsCard, GlassmorphicEmptyState, GlassmorphicProgress } from '../components'; // ✨ UPGRADED: Premium Glassmorphism
import { useGlassPreset } from '../hooks/useGlassmorphism'; // ✨ NEW: Glassmorphism config

const GestureHandlerRootView = getGestureHandlerRootView();
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import { updateTask } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { hapticMedium, hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import TaskStatusButtons from '../components/TaskStatusButtons';
import { useTheme } from '../contexts/ThemeContext';
import { canChangeTaskStatus } from '../services/permissions';
import { toMs } from '../utils/dateUtils';
import QuickTip, { TIPS } from '../components/QuickTip';
import SyncIndicator from '../components/SyncIndicator';
import AmbientOrbs from '../components/AmbientOrbs';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { useKanbanFilters } from '../hooks/useKanbanFilters';
import { createKanbanStyles } from './kanban/KanbanScreenStyles';

export default function KanbanScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const STATUSES = useMemo(() => [
    { key: 'pendiente',   label: 'Pendiente',   color: theme.warning,   icon: 'hourglass-outline' },
    { key: 'en_proceso',  label: 'En proceso',  color: theme.info,      icon: 'play-circle-outline' },
    { key: 'en_revision', label: 'En revisión', color: theme.secondary, icon: 'eye-outline' },
    { key: 'cerrada',     label: 'Cerrada',     color: theme.success,   icon: 'checkmark-circle-outline' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [theme.warning, theme.info, theme.secondary, theme.success]);
  const { isDesktop } = useResponsive();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, isLoading, currentUser } = useTasks();
  const {
    filters, setFilters,
    sortBy, setSortBy,
    isTaskOverdue, applyFilters, sortTasks,
    taskStats, getFilteredByStatus,
    hasActiveFilters, resetFilters,
  } = useKanbanFilters(tasks, currentUser);
  const [refreshing, setRefreshing] = useState(false);
  const [draggingTask, _setDraggingTask] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const { showSuccess, showError, showWarning } = useNotification();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [compactView, setCompactView] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, task: null, position: { x: 0, y: 0 } });
  
  // Animaciones
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const columnsSlide = useRef(new Animated.Value(100)).current;
  // Animaciones para cada columna (entrada escalonada)
  const columnAnimations = useRef({
    pendiente: new Animated.Value(0),
    en_proceso: new Animated.Value(0),
    en_revision: new Animated.Value(0),
    cerrada: new Animated.Value(0)
  }).current;
  
  // Animación del FAB
  const fabScale = useRef(new Animated.Value(0)).current;

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Calcular ancho de columnas según tamaño de pantalla
  const getColumnWidth = () => {
    const screenWidth = dimensions.width;
    const isWeb = Platform.OS === 'web';
    const padding = isWeb ? 16 : 8;
    const gap = isWeb ? 12 : 12;
    
    if (isWeb && screenWidth > 1400) {
      // Desktop muy grande: 4 columnas visibles
      return (screenWidth - padding * 2 - gap * 3) / 4;
    } else if (isWeb && screenWidth > 1100) {
      // Desktop grande: 4 columnas
      return (screenWidth - padding * 2 - gap * 3) / 4;
    } else if (isWeb && screenWidth > 850) {
      // Desktop mediano: 3 columnas visibles
      return (screenWidth - padding * 2 - gap * 2) / 3;
    } else if (isWeb && screenWidth > 600) {
      // Tablet web: 2 columnas visibles
      return (screenWidth - padding * 2 - gap) / 2;
    } else if (isWeb && screenWidth > 400) {
      // Móvil web: scroll horizontal - columna de 280px
      return 280;
    } else if (isWeb) {
      // Móvil web pequeño: scroll horizontal - columna de 260px
      return 260;
    } else if (screenWidth > 768) {
      // Tablet nativa: 2 columnas
      return (screenWidth - padding * 2 - gap) / 2;
    } else if (screenWidth > 480) {
      // Móvil grande nativo: scroll horizontal
      return screenWidth * 0.85;
    } else {
      // Móvil pequeño nativo: scroll horizontal compacto
      return screenWidth * 0.88;
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columnWidth = useMemo(() => getColumnWidth(), [dimensions.width]);


  // Animación de entrada
  useEffect(() => {
    const startAnimations = () => {
      Animated.parallel([
        Animated.spring(headerSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(columnsSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const delays = [0, 60, 120, 180];
      STATUSES.forEach((status, index) => {
        Animated.timing(columnAnimations[status.key], {
          toValue: 1,
          duration: 280,
          delay: delays[index],
          useNativeDriver: true,
        }).start();
      });

      Animated.spring(fabScale, {
        toValue: 1,
        delay: 100,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    if (Platform.OS !== 'web') {
      const interaction = InteractionManager.runAfterInteractions(startAnimations);
      return () => interaction.cancel();
    } else {
      startAnimations();
    }
  }, [columnAnimations, columnsSlide, fabScale, headerSlide]);

  // Suscribirse a cambios en tiempo real con debounce
  useEffect(() => {
    // Ya no necesitamos suscribirse, el TasksContext se encarga
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const changeStatus = useCallback(async (taskId, newStatus) => {
    try {
      // Verificar permisos (ahora valida el newStatus específico para directores)
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const statusPermission = canChangeTaskStatus(currentUser, task, newStatus);
        if (!statusPermission.canChange) {
          showWarning(statusPermission.reason || 'No tienes permisos para este cambio');
          hapticWarning();
          return;
        }
      }
      
      hapticMedium();
      await updateTask(taskId, { status: newStatus });
      showSuccess('Estado actualizado correctamente');
      
      // Haptic de éxito
      hapticSuccess();
    } catch (error) {
      showError('Error al actualizar estado');
      hapticWarning();
    }
  }, [currentUser, tasks, showError, showSuccess, showWarning]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    await changeStatus(taskId, newStatus);
  }, [changeStatus]);

  const openDetail = useCallback((task) => {
    // Todos pueden ver detalles, pero con permisos limitados según rol
    // El TaskDetailScreen se encarga de mostrar las opciones correctas
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);


  // Componente de tarjeta arrastrable con mejoras visuales
  const DraggableCard = ({ item, status }) => {
    const isOverdue = isTaskOverdue(item);
    const priorityColors = { alta: theme.error, media: theme.warning, baja: theme.success };
    const priorityColor = priorityColors[item.priority] || theme.border;
    
    // Calcular días en el estado actual
    const daysInStatus = item.statusChangedAt ? 
      Math.floor((Date.now() - item.statusChangedAt) / (1000 * 60 * 60 * 24)) : 0;
    const statusAgeColor = daysInStatus > 10 ? theme.error : daysInStatus > 5 ? theme.warning : theme.textSecondary;

    // Borde según prioridad
    const borderColor = item.priority === 'alta' ? theme.error :
                        item.priority === 'media' ? theme.warning : theme.border;
    
    return (
      <PremiumGlassCard
        onPress={() => {
          hapticLight();
          openDetail(item);
        }}
        onLongPress={() => {
          hapticMedium();
          setContextMenu({ visible: true, task: item, position: { x: 0, y: 0 } });
        }}
        pressable={true}
        intensity={item.priority === 'alta' ? 'strong' : 'medium'}
        glowEffect={item.priority === 'alta'}
        glowColor={priorityColor}
        highlighted={item.priority === 'alta'}
        showRimGlow={true}
        showGradient={true}
        padding={compactView ? 8 : 12}
        borderRadius={14}
        style={[
          styles.card,
          draggingTask?.id === item.id && styles.cardDragging,
          compactView && { paddingVertical: 8, paddingHorizontal: 12 }
        ]}
      >
        {/* Header con badges - Solo en vista expandida */}
        {!compactView && (
          <View style={styles.cardTopRow}>
            <View style={[
              styles.priorityChip,
              item.priority === 'alta' && { backgroundColor: theme.error },
              item.priority === 'media' && { backgroundColor: theme.warning },
              item.priority === 'baja' && { backgroundColor: theme.success }
            ]}>
              <Ionicons 
                name={item.priority === 'alta' ? 'flash' : item.priority === 'media' ? 'warning' : 'checkmark-circle'} 
                size={10} 
                color="#FFFFFF" 
              />
              <Text style={styles.priorityChipText}>
                {item.priority === 'alta' ? 'URGENTE' : item.priority === 'media' ? 'MEDIA' : 'BAJA'}
              </Text>
              {/* Pulsación para prioridad alta */}
              {item.priority === 'alta' && <PulsingDot size={4} color="#FFFFFF" />}
            </View>
            
            {isOverdue && (
              <View style={styles.overdueChip}>
                <Ionicons name="time" size={10} color="#FFFFFF" />
                <Text style={styles.overdueChipText}>VENCIDA</Text>
              </View>
            )}
          </View>
        )}

        {/* Título con indicador de prioridad en vista compacta */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {compactView && (
            <>
              <View style={[styles.compactPriorityDot, { backgroundColor: priorityColor }]} />
              {item.priority === 'alta' && <PulsingDot size={3} color={priorityColor} />}
            </>
          )}
          <Text 
            style={[styles.cardTitle, { color: theme.text, flex: 1 }]} 
            numberOfLines={compactView ? 1 : 2}
          >
            {item.title}
          </Text>
          {compactView && isOverdue && (
            <Ionicons name="alert-circle" size={12} color={theme.error} />
          )}
        </View>
        
        {/* Meta información - Solo en vista expandida */}
        {!compactView && (
          <>
            <View style={styles.cardInfoGrid}>
              <View style={styles.cardInfoItem}>
                <Ionicons name="person" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.assignedTo || 'Sin asignar'}
                </Text>
              </View>

              <View style={styles.cardInfoItem}>
                <Ionicons name="calendar-outline" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]}>
                  {new Date(toMs(item.dueAt)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
            
            {/* Etiquetas */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.cardTagsContainer}>
                {item.tags.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={[styles.cardTag, { backgroundColor: theme.primaryAlpha }]}>
                    <Text style={[styles.cardTagText, { color: theme.primary }]}>#{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={[styles.cardTagMore, { color: theme.textSecondary }]}>+{item.tags.length - 3}</Text>
                )}
              </View>
            )}
            
            {/* Indicador de días en estado actual */}
            {daysInStatus > 0 && (
              <View style={styles.statusAgeIndicator}>
                <Ionicons name="time-outline" size={10} color={statusAgeColor} />
                <Text style={[styles.statusAgeText, { color: statusAgeColor }]}>
                  {daysInStatus === 1 ? 'Hace 1 día' : `Hace ${daysInStatus} días`}
                </Text>
                {daysInStatus > 10 && <Ionicons name="warning" size={12} color={statusAgeColor} />}
              </View>
            )}
          </>
        )}
        
        {/* Botones de cambio de estado - Disponible para todos los roles */}
        {!compactView && (
          <TaskStatusButtons
            currentStatus={item.status}
            taskId={item.id}
            onStatusChange={handleStatusChange}
          />
        )}
      </PremiumGlassCard>
    );
  };

  // Filtros, ordenamiento y stats viven en useKanbanFilters (ver hooks/useKanbanFilters.js)

  // Cambiar prioridad rápidamente
  const changePriority = async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      hapticMedium();
      showSuccess(`Prioridad cambiada a ${priority}`);
      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
    } catch (error) {
      // Error silencioso
    }
  };

  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(status => {
      grouped[status.key] = getFilteredByStatus(status.key, tasks);
    });
    return grouped;
  }, [tasks, getFilteredByStatus, STATUSES]);

  const renderColumn = useCallback((status) => {
    const { byStatus, filtered, sorted } = tasksByStatus[status.key] || { byStatus: [], filtered: [], sorted: [] };
    const completionRate = byStatus.length > 0 ? (filtered.length / byStatus.length) * 100 : 0;
    
    // Calcular tareas vencidas en esta columna
    const overdueTasks = sorted.filter(task => toMs(task.dueAt) < Date.now()).length;
    
    // Calcular tareas de alta prioridad
    const highPriorityTasks = sorted.filter(task => task.priority === 'alta').length;

    const columnAnimation = columnAnimations[status.key];
    const animatedStyle = {
      opacity: columnAnimation,
      transform: [
        {
          translateY: columnAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }
      ]
    };

    return (
      <Animated.View key={status.key} style={[styles.column, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)', borderWidth: 0.5 }, animatedStyle]}>
        {/* Barra de acento superior de color por estado */}
        <View style={{ height: 3, backgroundColor: status.color, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />

        <View
          style={styles.columnHeader}
          accessible={true}
          accessibilityLabel={`Columna ${status.label}, ${sorted.length} tareas`}
          accessibilityRole="header"
        >
          <View style={styles.columnTitleContainer}>
            <View style={[styles.columnIconCircle, { backgroundColor: status.color }]} />
            <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
          </View>

          <View style={styles.columnBadges}>
            <View style={[styles.columnCount, { backgroundColor: status.color + '22' }]}>
              <Text style={[styles.columnCountText, { color: status.color }]}>{sorted.length}</Text>
            </View>
            {overdueTasks > 0 && (
              <View style={[styles.overdueColumnBadge, { backgroundColor: theme.errorAlpha }]}>
                <Ionicons name="alert-circle" size={10} color={theme.error} />
                <Text style={[styles.columnCountText, { color: theme.error }]}>{overdueTasks}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Barra de progreso */}
        {byStatus.length > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: status.color,
                    width: `${completionRate}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {Math.round(completionRate)}% ({sorted.length}/{byStatus.length})
            </Text>
          </View>
        )}

        <FlatList
          data={sorted}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => <DraggableCard item={item} status={status} />}
          contentContainerStyle={{ paddingBottom: 8 }}
          // ⚡ Optimizaciones de rendimiento
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          initialNumToRender={6}
          updateCellsBatchingPeriod={100}
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
          ListEmptyComponent={() => (
            <FadeInView duration={400} delay={200} style={styles.emptyColumnState}>
              <View style={styles.emptyStateContent}>
                <View style={[styles.emptyStateIconContainer, { backgroundColor: status.color + '15' }]}>
                  <Ionicons 
                    name={status.key === 'cerrada' ? 'checkmark-circle-outline' : 'document-text-outline'} 
                    size={28} 
                    color={status.color} 
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  {status.key === 'cerrada' ? '¡Todo listo! 🎉' : 'Columna vacía'}
                </Text>
                <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
                  {status.key === 'cerrada' 
                    ? 'Todas las tareas están completadas' 
                    : 'Aquí aparecerán las tareas \n del estado ' + status.label}
                </Text>
              </View>
            </FadeInView>
          )}
        />
      </Animated.View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksByStatus, columnAnimations, theme, isDark]);

  const styles = React.useMemo(() => createKanbanStyles(theme, isDark, columnWidth, dimensions), [theme, isDark, columnWidth, dimensions]);

  const keyExtractor = useCallback((item) => item.id, []);

  // Estilo animado para FAB
  const fabAnimatedStyle = {
    transform: [{ scale: fabScale }],
    opacity: fabScale,
  };

  // Mostrar shimmer mientras se cargan las tareas
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
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
              {STATUSES.map(status => (
                <View key={status.key} style={{ flex: 1, borderRadius: 14, backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', padding: 12, minWidth: 200 }}>
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Premium Ambient Orbs - Glasmorfismo */}
        <AmbientOrbs intensity="medium" />
        
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
            
            {/* Indicador de Vencidas Premium en el Header */}
            {taskStats.overdueCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ ...filters, overdue: !filters.overdue });
                  hapticLight();
                }}
                style={[
                  styles.overdueHeaderBadge,
                  filters.overdue && styles.overdueHeaderBadgeActive
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.overdueHeaderPulse}>
                  <Ionicons name="warning" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.overdueHeaderContent}>
                  <Text style={styles.overdueHeaderCount}>
                    {taskStats.overdueCount}
                  </Text>
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
              {/* Toggle vista compacta */}
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
                <Ionicons
                  name={compactView ? 'list' : 'grid-outline'}
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              
              {/* Toggle ordenamiento */}
              <TouchableOpacity 
                onPress={() => {
                  setSortBy(sortBy === 'date' ? 'priority' : 'date');
                  hapticLight();
                }}
                style={styles.iconButton}
              >
                <Ionicons 
                  name={sortBy === 'date' ? 'time-outline' : 'flag-outline'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              {/* Estadísticas */}
              <TouchableOpacity
                onPress={() => setShowStats(!showStats)}
                style={styles.iconButton}
              >
                <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Ayuda */}
              <TouchableOpacity
                onPress={() => { hapticLight(); setShowHelpModal(true); }}
                style={styles.iconButton}
              >
                <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Barra compacta de filtros */}
        <View style={[styles.filterCompactBar, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.75)', borderBottomColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          {/* Chips de filtros activos */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.activeFiltersRow}
            style={{ flex: 1 }}
          >
            {/* Chip Mis tareas */}
            {currentUser && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ 
                    ...filters, 
                    responsible: filters.responsible === currentUser.email ? '' : currentUser.email 
                  });
                  hapticLight();
                }}
                style={[
                  styles.filterChipCompact,
                  { 
                    backgroundColor: filters.responsible === currentUser.email ? theme.primary : 'transparent',
                    borderColor: filters.responsible === currentUser.email ? theme.primary : theme.primary
                  }
                ]}
              >
                <Ionicons 
                  name="person" 
                  size={14} 
                  color={filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary} 
                />
                <Text style={[
                  styles.filterChipCompactText, 
                  { color: filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary }
                ]}>
                  Mis tareas
                </Text>
              </TouchableOpacity>
            )}

            {/* Chip de prioridad activa */}
            {filters.priority && (
              <View style={[styles.filterChipCompact, { backgroundColor: theme.error, borderColor: theme.error }]}>
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]}>
                  {filters.priority === 'alta' ? 'Urgente' : filters.priority === 'media' ? 'Media' : 'Baja'}
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, priority: '' })}>
                  <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chip de búsqueda activa */}
            {filters.searchText && (
              <View style={[styles.filterChipCompact, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                <Ionicons name="search" size={14} color="#FFFFFF" />
                <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]} numberOfLines={1}>
                  "{filters.searchText.substring(0, 15)}"
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, searchText: '' })}>
                  <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Botón abrir modal de filtros */}
          <TouchableOpacity
            onPress={() => {
              setShowFiltersModal(true);
              hapticLight();
            }}
            style={[styles.filterModalButton, { borderColor: theme.border }]}
          >
            <Ionicons name="options" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Modal de Filtros Premium */}
        <Modal
          visible={showFiltersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFiltersModal(false)}
        >
          <View style={styles.filterModalOverlay}>
            <View style={[styles.filterModalContainer, { backgroundColor: theme.background }]}>
              {/* Header del Modal */}
              <LinearGradient
                colors={theme.gradientPrimary.slice(0, 2)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterModalHeader}
              >
                <View style={styles.filterModalHeaderContent}>
                  <View>
                    <Text style={styles.filterModalTitle}>Filtros</Text>
                    <Text style={styles.filterModalSubtitle}>Personaliza tu vista</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowFiltersModal(false)}
                    style={styles.filterModalCloseBtn}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
                {/* Búsqueda */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="search" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Buscar tareas
                    </Text>
                  </View>
                  <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
                    <TextInput
                      style={[styles.searchInputWrapper, { color: theme.text, flex: 1 }]}
                      placeholder="Buscar tareas..."
                      placeholderTextColor={theme.textSecondary}
                      value={filters.searchText}
                      onChangeText={text => setFilters(prev => ({ ...prev, searchText: text }))}
                      returnKeyType="search"
                      autoCorrect={false}
                    />
                    {filters.searchText ? (
                      <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, searchText: '' }))}>
                        <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Prioridad */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="flag" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Prioridad
                    </Text>
                  </View>
                  <View style={styles.priorityButtonsRow}>
                    {[
                      { key: 'alta', label: 'Urgente', color: theme.error, icon: 'flash' },
                      { key: 'media', label: 'Media', color: theme.warning, icon: 'remove' },
                      { key: 'baja', label: 'Normal', color: theme.success, icon: 'arrow-down' }
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => {
                          setFilters({ ...filters, priority: filters.priority === p.key ? '' : p.key });
                          hapticLight();
                        }}
                        style={[
                          styles.priorityButton,
                          { 
                            backgroundColor: filters.priority === p.key ? p.color : theme.cardBackground,
                            borderColor: p.color
                          }
                        ]}
                      >
                        <Ionicons 
                          name={p.icon} 
                          size={18} 
                          color={filters.priority === p.key ? '#FFFFFF' : p.color} 
                        />
                        <Text style={[
                          styles.priorityButtonText,
                          { color: filters.priority === p.key ? '#FFFFFF' : p.color }
                        ]}>
                          {p.label}
                        </Text>
                        {taskStats.priorityCounts[p.key] > 0 && (
                          <View style={[styles.priorityBadge, { backgroundColor: filters.priority === p.key ? 'rgba(255,255,255,0.3)' : p.color }]}>
                            <Text style={[styles.priorityBadgeText, { color: '#FFFFFF' }]}>
                              {taskStats.priorityCounts[p.key]}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Filtros rápidos */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="options" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Filtros rápidos
                    </Text>
                  </View>
                  <View style={styles.quickFilterGrid}>
                    {/* Vencidas */}
                    {taskStats.overdueTasksCount > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setFilters({ ...filters, overdue: !filters.overdue });
                          hapticLight();
                        }}
                        style={[
                          styles.quickFilterCard,
                          { 
                            backgroundColor: filters.overdue ? theme.errorAlpha : theme.cardBackground,
                            borderColor: filters.overdue ? theme.error : theme.border
                          }
                        ]}
                      >
                        <View style={[styles.quickFilterIconBg, { backgroundColor: theme.error }]}>
                          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.quickFilterCardContent}>
                          <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Vencidas</Text>
                          <Text style={[styles.quickFilterCardCount, { color: theme.error }]}>
                            {taskStats.overdueTasksCount} tareas
                          </Text>
                        </View>
                        {filters.overdue && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.error} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Mis tareas */}
                    {currentUser && (
                      <TouchableOpacity
                        onPress={() => {
                          setFilters({ 
                            ...filters, 
                            responsible: filters.responsible === currentUser.email ? '' : currentUser.email 
                          });
                          hapticLight();
                        }}
                        style={[
                          styles.quickFilterCard,
                          { 
                            backgroundColor: filters.responsible === currentUser.email ? theme.primaryAlpha : theme.cardBackground,
                            borderColor: filters.responsible === currentUser.email ? theme.primary : theme.border
                          }
                        ]}
                      >
                        <View style={[styles.quickFilterIconBg, { backgroundColor: theme.primary }]}>
                          <Ionicons name="person" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.quickFilterCardContent}>
                          <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Mis tareas</Text>
                          <Text style={[styles.quickFilterCardCount, { color: theme.primary }]}>
                            {taskStats.myTasksCount} asignadas
                          </Text>
                        </View>
                        {filters.responsible === currentUser.email && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Hoy */}
                    <TouchableOpacity
                      onPress={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        // Toggle: si ya está activo, desactivar
                        if (filters.dueToday) {
                          setFilters({ ...filters, dueToday: false });
                        } else {
                          setFilters({ ...filters, dueToday: true });
                        }
                        hapticLight();
                      }}
                      style={[
                        styles.quickFilterCard,
                        { 
                          backgroundColor: filters.dueToday ? theme.warningAlpha : theme.cardBackground,
                          borderColor: filters.dueToday ? theme.warning : theme.border
                        }
                      ]}
                    >
                      <View style={[styles.quickFilterIconBg, { backgroundColor: theme.warning }]}>
                        <Ionicons name="today" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.quickFilterCardContent}>
                        <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Para hoy</Text>
                        <Text style={[styles.quickFilterCardCount, { color: theme.warning }]}>
                          {taskStats.todayCount} tareas
                        </Text>
                      </View>
                      {filters.dueToday && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.warning} />
                      )}
                    </TouchableOpacity>

                    {/* Esta semana */}
                    <TouchableOpacity
                      onPress={() => {
                        if (filters.dueThisWeek) {
                          setFilters({ ...filters, dueThisWeek: false });
                        } else {
                          setFilters({ ...filters, dueThisWeek: true });
                        }
                        hapticLight();
                      }}
                      style={[
                        styles.quickFilterCard,
                        { 
                          backgroundColor: filters.dueThisWeek ? theme.infoAlpha : theme.cardBackground,
                          borderColor: filters.dueThisWeek ? theme.info : theme.border
                        }
                      ]}
                    >
                      <View style={[styles.quickFilterIconBg, { backgroundColor: theme.info }]}>
                        <Ionicons name="calendar" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.quickFilterCardContent}>
                        <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Esta semana</Text>
                        <Text style={[styles.quickFilterCardCount, { color: theme.info }]}>
                          {taskStats.thisWeekCount} tareas
                        </Text>
                      </View>
                      {filters.dueThisWeek && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.info} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Footer con botones */}
              <View style={[styles.filterModalFooter, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.9)', borderTopColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
                <TouchableOpacity
                  onPress={() => {
                    setFilters({ searchText: '', area: '', responsible: '', priority: '', overdue: false, dueToday: false, dueThisWeek: false });
                    hapticLight();
                  }}
                  style={[styles.filterModalClearBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name="refresh" size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterModalClearText, { color: theme.textSecondary }]}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowFiltersModal(false);
                    hapticLight();
                  }}
                  style={styles.filterModalApplyBtn}
                >
                  <LinearGradient
                    colors={theme.gradientPrimary.slice(0, 2)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterModalApplyGradient}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.filterModalApplyText}>Aplicar filtros</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Modal de Ayuda - Kanban */}
        <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
          <View style={[styles.filterModalOverlay]}>
            <View style={[styles.filterModalContainer, { backgroundColor: theme.background, maxHeight: '80%' }]}>
              <LinearGradient colors={theme.gradientPrimary.slice(0, 2)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.filterModalHeader}>
                <View style={styles.filterModalHeaderContent}>
                  <View>
                    <Text style={styles.filterModalTitle}>Guía del Tablero Kanban</Text>
                    <Text style={styles.filterModalSubtitle}>Cómo usar cada elemento</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.filterModalCloseBtn}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
                {[
                  { icon: 'grid', color: '#9F2241', title: 'Columnas de estado', desc: 'Cada columna representa un estado: Pendiente → En proceso → En revisión → Cerrada. Las tareas se muestran en su columna actual.' },
                  { icon: 'options', color: '#6366F1', title: 'Filtros avanzados', desc: 'Toca el ícono ⊞ para filtrar por búsqueda, área, responsable, prioridad, vencidas o fecha.' },
                  { icon: 'person', color: '#3B82F6', title: 'Mis tareas', desc: 'El chip "Mis tareas" en la barra de filtros muestra solo las tareas asignadas a ti.' },
                  { icon: 'warning', color: '#F59E0B', title: 'Riesgo de retraso (IA)', desc: 'Cada tarea muestra un badge de riesgo bajo/medio/alto calculado con IA basado en el historial del área.' },
                  { icon: 'time-outline', color: '#EF4444', title: 'Ordenamiento', desc: 'Cambia entre ordenar por fecha (⏱) o por prioridad (⚑) con el botón en el encabezado.' },
                  { icon: 'stats-chart', color: '#10B981', title: 'Estadísticas', desc: 'Activa el panel de estadísticas para ver tasas de completitud, tareas vencidas y prioridad por columna.' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: theme.border }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 }}>{item.title}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.filterModalFooter}>
                <TouchableOpacity style={[styles.filterModalApply, { flex: 1 }]} onPress={() => setShowHelpModal(false)}>
                  <LinearGradient colors={theme.gradientPrimary.slice(0, 2)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.filterModalApplyGradient, { borderRadius: 14 }]}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.filterModalApplyText}>¡Entendido!</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Wrapper para las columnas - diferente layout en web vs mobile */}
        {Platform.OS === 'web' ? (
          <View 
            style={[styles.board, { 
              flex: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'row'
            }]}
          >
            {STATUSES.map(renderColumn)}
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
            {STATUSES.map(renderColumn)}
          </ScrollView>
        )}
        
        {/* Indicador visual de drag en proceso */}
        {draggingTask && (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={20} color={theme.primary} />
            <Text style={styles.dragIndicatorText}>
              Arrastra a una columna para cambiar estado
            </Text>
          </View>
        )}

        {/* FAB para crear tarea */}
        <Animated.View style={fabAnimatedStyle}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }]}
            onPress={() => {
              // Solo admin puede crear tareas
              if (!currentUser || (currentUser.role !== 'admin')) {
                showWarning('Solo administradores pueden crear tareas');
                return;
              }
              hapticMedium();
              navigation.navigate('TaskDetail', { task: null });
            }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Menú contextual */}
        {contextMenu.visible && contextMenu.task && (
          <BottomSheet
            visible={contextMenu.visible}
            onClose={() => setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } })}
            height={300}
            title="Edición Rápida"
          >
            <View style={styles.contextMenuContent}>
              <Text style={[styles.contextTaskTitle, { color: theme.text }]}>
                {contextMenu.task.title}
              </Text>
              
              <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Cambiar prioridad:</Text>
              <View style={styles.priorityOptions}>
                {['alta', 'media', 'baja'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' },
                      contextMenu.task.priority === priority && { backgroundColor: theme.primaryAlpha }
                    ]}
                    onPress={() => changePriority(contextMenu.task.id, priority)}
                  >
                    <Text style={[styles.priorityOptionText, { color: theme.text }]}>
                      {priority === 'alta' ? '🔴 Alta' : priority === 'media' ? '🟡 Media' : '🟢 Baja'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.contextLabel, { color: theme.textSecondary, marginTop: 16 }]}>Cambiar estado:</Text>
              <View style={styles.statusOptions}>
                {STATUSES.filter(s => s.key !== 'cerrada' || currentUser?.role === 'admin').map(status => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusOption,
                      { backgroundColor: status.color + '20' },
                      contextMenu.task.status === status.key && { borderWidth: 2, borderColor: status.color }
                    ]}
                    onPress={() => {
                      changeStatus(contextMenu.task.id, status.key);
                      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
                    }}
                  >
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={[styles.statusOptionText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BottomSheet>
        )}

        {/* BottomSheet para estadísticas */}
        <BottomSheet
          visible={showStats}
          onClose={() => setShowStats(false)}
          height={400}
          title="Estadísticas del Tablero"
        >
          <View style={styles.statsContainer}>
            {STATUSES.map(status => {
              const statusTasks = tasksByStatus[status.key]?.byStatus || [];
              const total = tasks.length;
              const percentage = total > 0 ? (statusTasks.length / total) * 100 : 0;
              
              return (
                <View key={status.key} style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={styles.statLabel}>{status.label}</Text>
                  </View>
                  <View style={styles.statProgress}>
                    <CircularProgress
                      size={60}
                      strokeWidth={6}
                      progress={percentage}
                      color={status.color}
                    />
                    <View style={styles.statNumbers}>
                      <Text style={styles.statCount}>{statusTasks.length}</Text>
                      <Text style={styles.statPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </BottomSheet>

        
        {/* 💡 Tip de ayuda para tablero Kanban */}
        <QuickTip
          {...TIPS.KANBAN_DRAG}
          position="bottom"
          delay={2500}
        />
        <SyncIndicator />
        </View>{/* contentWrapper */}
      </View>
    </GestureHandlerRootView>
  );
}
