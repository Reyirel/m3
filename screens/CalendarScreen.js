// screens/CalendarScreen.js
// Vista de calendario mensual con tareas por día - GLASSMORPHISM UI
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Platform, Easing, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ShimmerEffect from '../components/ShimmerEffect';
import SpringCard from '../components/SpringCard';
import FadeInView from '../components/FadeInView';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { useTasks } from '../contexts/TasksContext';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useResponsive } from '../utils/responsive';
import { SPACING, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';
import WebSafeBlur from '../components/WebSafeBlur';
import { toMs } from '../utils/dateUtils';
import AmbientOrbs from '../components/AmbientOrbs';
import { PremiumGlassCard, GlassmorphicHeader, GlassmorphicDivider, GlassmorphicEmptyState } from '../components'; // ✨ UPGRADED: Premium Glassmorphism

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
    <FadeInView duration={350} delay={index * 80} style={{ marginBottom: compactTaskView ? 6 : 12 }}>
      <RippleButton
        key={task.id}
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
          navigation.navigate('TaskDetail', { task });
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
  const filteredSelectedTasks = selectedDateTasks.filter(task => {
    if (taskStatusFilter === 'todas') return true;
    if (taskStatusFilter === 'pendiente') return task.status === 'pendiente';
    if (taskStatusFilter === 'en-progreso') return task.status === 'en_proceso' || task.status === 'en-progreso';
    if (taskStatusFilter === 'revision') return task.status === 'en_revision' || task.status === 'revision';
    if (taskStatusFilter === 'cerrada') return task.status === 'cerrada';
    return true;
  });

  // Conteos para chips de filtro
  const taskStatusCounts = {
    todas: selectedDateTasks.length,
    pendiente: selectedDateTasks.filter(t => t.status === 'pendiente').length,
    'en-progreso': selectedDateTasks.filter(t => t.status === 'en_proceso' || t.status === 'en-progreso').length,
    revision: selectedDateTasks.filter(t => t.status === 'en_revision' || t.status === 'revision').length,
    cerrada: selectedDateTasks.filter(t => t.status === 'cerrada').length,
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
            <ShimmerEffect width="100%" height={60} style={{ marginBottom: 16, borderRadius: 12 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...Array(35)].map((_, i) => (
                <ShimmerEffect key={i} width={isDesktop ? 60 : 40} height={isDesktop ? 60 : 40} style={{ borderRadius: 8 }} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  // Estilos animados mejorados con glassmorphism
  const headerAnimatedStyle = {
    transform: [{ translateY: headerSlide }],
    opacity: headerOpacity,
  };
  
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
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Premium Ambient Orbs - Glasmorfismo */}
      <AmbientOrbs intensity="medium" />
      
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* ✨ Glassmorphic Header */}
      <Animated.View style={[{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        <GlassmorphicHeader
          title="Calendario"
          subtitle="Vista mensual de tareas y eventos"
          icon="calendar"
          showGradient={true}
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
              disabled: false,
              color: '#FFFFFF'
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
          <TouchableOpacity 
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
                {selectedDateTasks.filter(t => t.status === 'en_proceso' || t.status === 'en-progreso').length > 0 && (
                  <View style={[styles.modalStatBadge, { backgroundColor: theme.infoAlpha }]}>
                    <Ionicons name="sync" size={14} color={theme.info} />
                    <Text style={[styles.modalStatText, { color: theme.info }]}>
                      {selectedDateTasks.filter(t => t.status === 'en_proceso' || t.status === 'en-progreso').length} en proceso
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
                    { key: 'en-progreso', label: 'En progreso', icon: 'play-circle' },
                    { key: 'revision', label: 'Revisión', icon: 'eye' },
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

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    } : {})
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: isDesktop ? 900 : '100%',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    } : {})
  },
  // Header con glassmorphism
  headerGradient: {
    overflow: 'hidden',
  },
  headerGradientInner: {
    borderBottomLeftRadius: RADIUS.xl + 4,
    borderBottomRightRadius: RADIUS.xl + 4,
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 52,
    paddingBottom: SPACING.xl
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heading: { 
    fontSize: isDesktop ? 36 : Platform.OS === 'android' ? 32 : 30, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isDesktop ? 18 : 14,
    paddingVertical: isDesktop ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: isDesktop ? 24 : isTablet ? 16 : 14,
    paddingBottom: isDesktop ? 48 : 40,
  },
  // Quick Stats Inline - Compacto
  quickStatsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.glassBorder,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.10 : 0.06,
    shadowRadius: 6,
    ...Platform.select({ android: { elevation: 2 } }),
  },
  quickStatInlineItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickStatInlineValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickStatInlineLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  quickStatInlineDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.border,
  },
  completionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  // Month controls con glassmorphism premium
  monthControlsWrapper: {
    marginBottom: SPACING.lg,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: theme.glassBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.20 : 0.06,
    shadowRadius: 8,
    ...Platform.select({ android: { elevation: 2 } }),
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  monthText: {
    fontSize: isDesktop ? 20 : 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  // Calendario principal con glassmorphism premium
  calendarContainer: {
    borderRadius: isDesktop ? 24 : 20,
    padding: isDesktop ? 20 : 14,
    marginBottom: SPACING.lg,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.30 : 0.08,
    shadowRadius: 12,
    ...Platform.select({ android: { elevation: 4 } }),
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 6,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: isDark ? 'rgba(235,235,245,0.55)' : 'rgba(60,60,67,0.55)',
  },
  weekDayWeekend: {
    color: theme.primary,
    opacity: 0.8,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayWrapper: {
    width: `${100 / 7}%`,
    aspectRatio: isDesktop ? 1.1 : 1.05,
    padding: isDesktop ? 4 : 3,
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: isDesktop ? 1.1 : 1.05,
    padding: isDesktop ? 4 : 3,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: isDesktop ? 14 : 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  dayWithTasks: {
    backgroundColor: isDark ? 'rgba(159,34,65,0.18)' : 'rgba(159,34,65,0.07)',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(192,34,62,0.55)' : 'rgba(159,34,65,0.40)',
  },
  dayWeekend: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(159,34,65,0.03)',
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(159,34,65,0.12)',
  },
  dayToday: {
    backgroundColor: theme.primary,
    borderWidth: 0,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.50,
    shadowRadius: 10,
    ...Platform.select({ android: { elevation: 6 } }),
  },
  todayCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dayHighPriority: {
    backgroundColor: isDark ? 'rgba(255,59,48,0.22)' : 'rgba(255,59,48,0.10)',
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  dayOverdue: {
    backgroundColor: isDark ? 'rgba(255,149,0,0.20)' : 'rgba(255,149,0,0.10)',
    borderColor: '#FF9500',
    borderWidth: 1.5,
  },
  dayCompleted: {
    backgroundColor: isDark ? 'rgba(48,209,88,0.16)' : 'rgba(52,199,89,0.10)',
    borderColor: isDark ? '#30D158' : '#34C759',
    borderWidth: 1.5,
  },
  dayTaskCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
  },
  dayTaskCountToday: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayTaskCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isDesktop ? 8 : 6,
    zIndex: 1,
  },
  dayNumber: {
    fontSize: isDesktop ? 18 : isTablet ? 16 : 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  dayNumberWeekend: {
    color: theme.primary,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: isDesktop ? 20 : isTablet ? 18 : 17,
  },
  dayNumberAlert: {
    color: theme.error,
    fontWeight: '800',
  },
  dayNumberWarning: {
    color: theme.warning,
    fontWeight: '700',
  },
  taskIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isDesktop ? 4 : 3,
    marginTop: isDesktop ? 4 : 2,
    minHeight: isDesktop ? 12 : 10,
    flexWrap: 'wrap',
  },
  taskDot: {
    width: isDesktop ? 8 : 7,
    height: isDesktop ? 8 : 7,
    borderRadius: 99,
    backgroundColor: '#34C759',
  },
  taskDotHigh: {
    backgroundColor: '#FF3B30',
  },
  taskDotMedium: {
    backgroundColor: '#FF9500',
  },
  taskDotLow: {
    backgroundColor: '#34C759',
  },
  taskDotToday: {
    borderColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    width: isDesktop ? 9 : 8,
    height: isDesktop ? 9 : 8,
  },
  moreTasksBadge: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(159,34,65,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  moreTasksBadgeToday: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  moreTasks: {
    fontSize: isDesktop ? 10 : 9,
    fontWeight: '700',
    color: theme.primary,
  },
  // Leyenda con glassmorphism premium
  legend: {
    marginTop: SPACING.sm,
    padding: isDesktop ? 20 : 16,
    borderRadius: isDesktop ? 16 : 14,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.9)' : theme.glassStrong,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.15 : 0.06,
    shadowRadius: 10,
    ...Platform.select({ android: { elevation: 3 } }),
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.glass : theme.glassStrong,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal con glassmorphism
  modalBlurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl + 8,
    borderTopRightRadius: RADIUS.xl + 8,
    padding: isDesktop ? 28 : 22,
    paddingBottom: isDesktop ? 40 : 34,
    maxHeight: '85%',
    ...SHADOWS.xl,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  modalDateBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDateDay: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  modalDateMonth: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  modalTitle: {
    fontSize: isDesktop ? 18 : 17,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalDayStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  modalStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalStatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 450,
  },
  // Modal Task Cards con glassmorphism
  modalTaskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  modalTaskHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  modalTaskPriority: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.success,
    alignSelf: 'stretch',
  },
  modalTaskPriorityHigh: {
    backgroundColor: theme.error,
  },
  modalTaskPriorityMedium: {
    backgroundColor: theme.warning,
  },
  modalTaskPriorityLow: {
    backgroundColor: theme.success,
  },
  modalTaskContent: {
    flex: 1,
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 10,
  },
  modalTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalTaskMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  modalTaskStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.2)' : 'rgba(159, 34, 65, 0.1)',
  },
  modalTaskStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTaskStatusClosed: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  modalTaskStatusInProgress: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
  },
  modalTaskStatusReview: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
  },
  // Compact view styles
  modalTaskCardCompact: {
    padding: 10,
    marginBottom: 6,
    borderRadius: 10,
  },
  compactTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactTaskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Modal filter styles
  modalFiltersRow: {
    marginBottom: 12,
  },
  modalFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  modalFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modalFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFilterCount: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalCompactToggle: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
});
