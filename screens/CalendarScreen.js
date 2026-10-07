// screens/CalendarScreen.js
// Vista de calendario mensual con tareas por día - GLASSMORPHISM UI
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Easing,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ShimmerEffect from '../components/ShimmerEffect';
import FadeInView from '../components/FadeInView';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { useTasks } from '../contexts/TasksContext';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import WebSafeBlur from '../components/WebSafeBlur';
import { toMs } from '../utils/dateUtils';
import ScreenHeader from '../components/ui/ScreenHeader';
import { isInProgress, countByStatus, matchesStatusFilter } from '../utils/taskStatus';
import { createStyles } from './calendar/CalendarScreenStyles';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, isLoading } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { showSuccess, showInfo } = useNotification();
  const [compactTaskView, setCompactTaskView] = useState(false); // Vista compacta de tareas
  const [taskStatusFilter, setTaskStatusFilter] = useState('todas'); // Filtro por estado en modal
  
  // Animaciones de entrada mejoradas
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const calendarSlide = useRef(new Animated.Value(100)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const monthTransition = useRef(new Animated.Value(0)).current;
  const legendSlide = useRef(new Animated.Value(50)).current;
  const legendOpacity = useRef(new Animated.Value(0)).current;

  // Animar elementos de entrada
  useEffect(() => {
    const startAnimations = () => {
      Animated.stagger(80, [
        Animated.parallel([
          Animated.spring(headerSlide, { toValue: 0, friction: 10, tension: 50, useNativeDriver: true }),
          Animated.timing(headerOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(calendarSlide, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
          Animated.timing(calendarOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(legendSlide, { toValue: 0, friction: 10, tension: 50, useNativeDriver: true }),
          Animated.timing(legendOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();

      Animated.spring(fabScale, { toValue: 1, delay: 100, friction: 5, tension: 50, useNativeDriver: true }).start();
    };

    if (Platform.OS !== 'web') {
      const interaction = InteractionManager.runAfterInteractions(startAnimations);
      return () => interaction.cancel();
    } else {
      startAnimations();
    }
  }, [calendarOpacity, calendarSlide, fabScale, headerOpacity, headerSlide, legendOpacity, legendSlide]);
  
  // Animación de transición de mes
  const animateMonthChange = useCallback((direction) => {
    monthTransition.setValue(direction * 30);
    Animated.spring(monthTransition, {
      toValue: 0,
      friction: 12,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [monthTransition]);

  // Generar días del mes con memoización para mejor rendimiento
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Agrupar tareas por fecha con memoización
  const tasksByDate = useMemo(() => {
    const grouped = {};
    
    tasks.forEach(task => {
      if (task.dueAt) {
        const date = new Date(toMs(task.dueAt));
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDate[dateKey] || [];
  };

  const previousMonth = useCallback(() => {
    animateMonthChange(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate, animateMonthChange]);

  const nextMonth = useCallback(() => {
    animateMonthChange(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate, animateMonthChange]);

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const openDayDetail = (date) => {
    hapticLight(); // Light haptic on date selection
    setSelectedDate(date);
    setModalVisible(true);
    hapticMedium(); // Haptic feedback when modal opens ✨
  };

  const renderDay = (date, index) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayTasks = getTasksForDate(date);
    const hasHighPriority = dayTasks.some(t => t.priority === 'alta' || t.priority === 'critica');
    const hasMediumPriority = dayTasks.some(t => t.priority === 'media');
    const isOverdue = dayTasks.some(t => toMs(t.dueAt) < Date.now() && t.status !== 'cerrada');
    const today = isToday(date);
    const hasTasks = dayTasks.length > 0;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const completedCount = dayTasks.filter(t => t.status === 'cerrada').length;
    const allCompleted = hasTasks && completedCount === dayTasks.length;

    return (
      <FadeInView
        key={date.toISOString()}
        duration={350}
        delay={Math.min(index * 15, 300)}
        style={styles.dayWrapper}
      >
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            if (hasTasks) {
              openDayDetail(date);
            } else {
              showInfo('No hay tareas para este día');
            }
          }}
          activeOpacity={0.75}
          accessible
          accessibilityLabel={`${date.getDate()} de ${MONTHS[date.getMonth()]}${hasTasks ? `, ${dayTasks.length} tareas` : ''}`}
          accessibilityRole="button"
          style={[
            styles.day,
            today && styles.dayToday,
            hasTasks && !today && styles.dayWithTasks,
            hasHighPriority && !today && styles.dayHighPriority,
            isOverdue && !hasHighPriority && !today && styles.dayOverdue,
            isWeekend && !today && !hasTasks && styles.dayWeekend,
            allCompleted && !today && styles.dayCompleted,
          ]}
        >
          {/* Badge de cantidad */}
          {hasTasks && dayTasks.length > 1 && (
            <View style={[styles.dayTaskCount, today && styles.dayTaskCountToday]}>
              <Text style={[styles.dayTaskCountText, today && { color: theme.primary }]}>
                {dayTasks.length}
              </Text>
            </View>
          )}

          <View style={styles.dayContent}>
            <Text style={[
              styles.dayNumber,
              { color: theme.text },
              isWeekend && !today && styles.dayNumberWeekend,
              today && styles.dayNumberToday,
              (hasHighPriority || isOverdue) && !today && styles.dayNumberAlert,
              hasMediumPriority && !hasHighPriority && !isOverdue && !today && styles.dayNumberWarning,
            ]}>
              {date.getDate()}
            </Text>

            {hasTasks && (
              <View style={styles.taskIndicators}>
                {dayTasks.slice(0, 3).map((task) => (
                  <View
                    key={task.id}
                    style={[
                      styles.taskDot,
                      task.priority === 'alta' || task.priority === 'critica' ? styles.taskDotHigh
                        : task.priority === 'media' ? styles.taskDotMedium
                        : styles.taskDotLow,
                      today && styles.taskDotToday,
                    ]}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <View style={[styles.moreTasksBadge, today && styles.moreTasksBadgeToday]}>
                    <Text style={[styles.moreTasks, today && { color: theme.primary }]}>
                      +{dayTasks.length - 3}
                    </Text>
                  </View>
                )}
                {hasHighPriority && !today && <PulsingDot size={7} color={theme.error} />}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </FadeInView>
    );
  };

  const renderTaskItem = (task, index) => (
    <FadeInView key={task.id} duration={350} delay={index * 80} style={{ marginBottom: compactTaskView ? 6 : 12 }}>
      <RippleButton
        style={[
          compactTaskView ? styles.modalTaskCardCompact : styles.modalTaskCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FAFAFA',
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
          }
        ]}
        onPress={() => {
          hapticLight();
          setModalVisible(false);
          navigation.navigate('TaskDetail', { task, taskId: task.id });
        }}
        rippleColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
      >
        {compactTaskView ? (
          // Vista compacta
          <View style={styles.compactTaskRow}>
            <View style={[
              styles.compactPriorityDot,
              task.priority === 'alta' && { backgroundColor: theme.error },
              task.priority === 'media' && { backgroundColor: theme.warning },
              task.priority === 'baja' && { backgroundColor: theme.success }
            ]} />
            <Text style={[styles.compactTaskTitle, { color: theme.text }]} numberOfLines={1}>
              {task.title}
            </Text>
            <View style={[
              styles.compactStatusBadge,
              task.status === 'cerrada' && { backgroundColor: theme.successAlpha },
              task.status === 'en_proceso' && { backgroundColor: theme.infoAlpha },
              task.status === 'en_revision' && { backgroundColor: theme.primaryAlpha },
              task.status === 'pendiente' && { backgroundColor: theme.warningAlpha },
            ]}>
              <Text style={[
                styles.compactStatusText,
                task.status === 'cerrada' && { color: theme.success },
                task.status === 'en_proceso' && { color: theme.info },
                task.status === 'en_revision' && { color: theme.secondary },
                task.status === 'pendiente' && { color: theme.warning },
              ]}>
                {task.status === 'cerrada' ? '✓' : task.status === 'en_proceso' ? '▶' : task.status === 'en_revision' ? '👁' : '⏳'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
          </View>
        ) : (
          // Vista normal
          <>
            <View style={styles.modalTaskHeader}>
              <View style={[
                styles.modalTaskPriority,
                task.priority === 'alta' && styles.modalTaskPriorityHigh,
                task.priority === 'media' && styles.modalTaskPriorityMedium,
                task.priority === 'baja' && styles.modalTaskPriorityLow
              ]} />
              <View style={styles.modalTaskContent}>
                <Text style={[styles.modalTaskTitle, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
                
                <View style={styles.modalTaskMeta}>
                  <View style={styles.modalTaskMetaItem}>
                    <Ionicons name="business-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.area}</Text>
                  </View>
                  <View style={styles.modalTaskMetaItem}>
                    <Ionicons name="person-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.assignedTo || 'Sin asignar'}</Text>
                  </View>
                  <View style={styles.modalTaskMetaItem}>
                    <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>
                      {new Date(toMs(task.dueAt)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.modalTaskFooter}>
              <View style={[
                styles.modalTaskStatus,
                task.status === 'cerrada' && styles.modalTaskStatusClosed,
                task.status === 'en_proceso' && styles.modalTaskStatusInProgress,
                task.status === 'en_revision' && styles.modalTaskStatusReview,
              ]}>
                <Text style={[
                  styles.modalTaskStatusText,
                  task.status === 'cerrada' && { color: theme.success },
                  task.status === 'en_proceso' && { color: theme.info },
                  task.status === 'en_revision' && { color: theme.secondary },
                ]}>
                  {task.status === 'en_proceso' ? 'En proceso' :
                   task.status === 'en_revision' ? 'En revisión' :
                   task.status === 'cerrada' ? 'Completada' : 'Pendiente'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </View>
          </>
        )}
      </RippleButton>
    </FadeInView>
  );

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  
  // Filtrar tareas según filtro de estado
  const filteredSelectedTasks = selectedDateTasks.filter(task => matchesStatusFilter(task.status, taskStatusFilter));

  // Conteos para chips de filtro
  const taskStatusCounts = {
    todas: selectedDateTasks.length,
    ...countByStatus(selectedDateTasks),
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  // Mostrar shimmer mientras se cargan las tareas
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradientInner}
          >
            <View style={styles.header}>
              <Text style={styles.heading}>Calendario</Text>
            </View>
          </LinearGradient>
          <View style={{ flex: 1, padding: 16 }}>
            <ShimmerEffect width="100%" height={60} style={{ marginBottom: 16, borderRadius: 16 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...Array(35)].map((_, i) => (
                <ShimmerEffect key={i} width={isDesktop ? 60 : 40} height={isDesktop ? 60 : 40} style={{ borderRadius: 10 }} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  // Estilos animados mejorados con glassmorphism
  const calendarAnimatedStyle = {
    opacity: calendarOpacity,
    transform: [
      { translateY: calendarSlide },
      { translateX: monthTransition },
    ],
  };
  
  const legendAnimatedStyle = {
    transform: [{ translateY: legendSlide }],
    opacity: legendOpacity,
  };
  

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      <Animated.View style={[{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        <ScreenHeader
          title="Calendario"
          subtitle="Vista mensual de tareas y eventos"
          icon="calendar"
          actions={[
            {
              icon: 'today-outline',
              onPress: () => {
                hapticMedium();
                animateMonthChange(0);
                setCurrentDate(new Date());
                showSuccess('¡Vista actualizada a hoy!');
                hapticSuccess();
              },
              color: '#FFFFFF',
            }
          ]}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Controles de mes con glassmorphism */}
        <Animated.View style={[styles.monthControlsWrapper, calendarAnimatedStyle]}>
          <View style={[styles.monthControls, { backgroundColor: theme.glass }]}>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                previousMonth();
              }}
              style={[styles.monthButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
              accessibilityLabel="Mes anterior"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.monthDisplay}
              onPress={() => {
                hapticMedium();
                setCurrentDate(new Date());
                showInfo('📅 Regresando al mes actual');
              }}
              activeOpacity={0.7}
              accessibilityLabel="Ir al mes actual"
              accessibilityRole="button"
            >
              <Text style={[styles.monthText, { color: theme.text }]}>
                {MONTHS[currentDate.getMonth()]}
              </Text>
              <Text style={[styles.yearText, { color: theme.textSecondary }]}>
                {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                nextMonth();
              }}
              style={[styles.monthButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
              accessibilityLabel="Mes siguiente"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Calendario con glassmorphism */}
        <Animated.View style={[styles.calendarContainer, calendarAnimatedStyle, { backgroundColor: theme.glass }]}>
          {/* Encabezado de días */}
          <View style={styles.weekHeader}>
            {DAYS.map((day, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <View key={day} style={styles.weekDay}>
                  <Text style={[
                    styles.weekDayText, 
                    isWeekend && styles.weekDayWeekend
                  ]}>{day}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid de calendario */}
          <View style={styles.calendar}>
            {calendarDays.map((date, index) => renderDay(date, index))}
          </View>
        </Animated.View>

        {/* Leyenda con glassmorphism */}
        <Animated.View style={[styles.legend, legendAnimatedStyle, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
          <View style={styles.legendHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.legendTitle, { color: theme.text }]}>Leyenda de prioridades</Text>
          </View>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotHigh]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Alta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotMedium]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.taskDotLow]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Baja</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de tareas del día con BlurView */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          hapticLight();
          setModalVisible(false);
        }}
      >
        <WebSafeBlur intensity={Platform.OS === 'ios' ? 50 : 100} style={styles.modalBlurOverlay} tint={isDark ? 'dark' : 'light'}>
          <TouchableOpacity accessibilityLabel="Cerrar" 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => {
              hapticLight();
              setModalVisible(false);
            }}
          />
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalDateBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.modalDateDay, { color: theme.primary }]}>
                    {selectedDate?.getDate()}
                  </Text>
                  <Text style={[styles.modalDateMonth, { color: theme.primary }]}>
                    {selectedDate ? MONTHS_SHORT[selectedDate.getMonth()] : ''}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedDate?.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'tarea' : 'tareas'} • {selectedDateTasks.filter(t => t.status === 'cerrada').length} completadas
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  hapticLight();
                  setModalVisible(false);
                }}
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Mini Stats del día */}
            {selectedDateTasks.length > 0 && (
              <View style={styles.modalDayStats}>
                {selectedDateTasks.filter(t => t.priority === 'alta' && t.status !== 'cerrada').length > 0 && (
                  <View style={[styles.modalStatBadge, { backgroundColor: theme.errorAlpha }]}>
                    <Ionicons name="alert-circle" size={14} color={theme.error} />
                    <Text style={[styles.modalStatText, { color: theme.error }]}>
                      {selectedDateTasks.filter(t => t.priority === 'alta' && t.status !== 'cerrada').length} urgentes
                    </Text>
                  </View>
                )}
                {selectedDateTasks.filter(t => isInProgress(t.status)).length > 0 && (
                  <View style={[styles.modalStatBadge, { backgroundColor: theme.infoAlpha }]}>
                    <Ionicons name="sync" size={14} color={theme.info} />
                    <Text style={[styles.modalStatText, { color: theme.info }]}>
                      {selectedDateTasks.filter(t => isInProgress(t.status)).length} en proceso
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Filtros y toggle compacto */}
            {selectedDateTasks.length > 0 && (
              <View style={styles.modalFiltersRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalFiltersContent}>
                  {[
                    { key: 'todas', label: 'Todas', icon: 'apps' },
                    { key: 'pendiente', label: 'Pendientes', icon: 'time-outline' },
                    { key: 'en_proceso', label: 'En proceso', icon: 'play-circle' },
                    { key: 'en_revision', label: 'Revisión', icon: 'eye' },
                    { key: 'cerrada', label: 'Cerradas', icon: 'checkmark-circle' },
                  ].map(filter => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.modalFilterChip,
                        { 
                          backgroundColor: taskStatusFilter === filter.key 
                            ? theme.primary 
                            : (isDark ? theme.glass : theme.glassStrong),
                          borderColor: taskStatusFilter === filter.key 
                            ? theme.primary 
                            : (isDark ? '#444' : '#ddd'),
                        }
                      ]}
                      onPress={() => {
                        hapticLight();
                        setTaskStatusFilter(filter.key);
                      }}
                    >
                      <Ionicons 
                        name={filter.icon} 
                        size={12} 
                        color={taskStatusFilter === filter.key ? '#fff' : theme.textSecondary} 
                      />
                      <Text style={[
                        styles.modalFilterLabel,
                        { color: taskStatusFilter === filter.key ? '#fff' : theme.text }
                      ]}>
                        {filter.label}
                      </Text>
                      <Text style={[
                        styles.modalFilterCount,
                        { color: taskStatusFilter === filter.key ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
                      ]}>
                        {taskStatusCounts[filter.key]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={[
                    styles.modalCompactToggle, 
                    { backgroundColor: compactTaskView ? theme.primary : (isDark ? theme.glass : theme.glassStrong) }
                  ]}
                  onPress={() => {
                    hapticLight();
                    setCompactTaskView(!compactTaskView);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar vista"
                >
                  <Ionicons 
                    name={compactTaskView ? 'list' : 'grid-outline'} 
                    size={16} 
                    color={compactTaskView ? '#fff' : theme.text} 
                  />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {filteredSelectedTasks.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.modalEmptyText, { color: theme.textSecondary }]}>
                    {selectedDateTasks.length === 0 ? 'No hay tareas para este día' : 'No hay tareas con este filtro'}
                  </Text>
                </View>
              ) : (
                filteredSelectedTasks.map((task, index) => renderTaskItem(task, index))
              )}
            </ScrollView>
          </Animated.View>
        </WebSafeBlur>
      </Modal>
      </View>

    </View>
  );
}
