// components/TaskItem.js
// TaskItem moderno con animaciones y glassmorphism - Compatible con web
import React, { useEffect, useState, memo, useRef, useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassView } from '../utils/GlassView';
import { useResponsive } from '../utils/responsive';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { getSwipeable } from '../utils/platformComponents';
import ContextMenu from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';
import Avatar from './Avatar';
import ProgressBar from './ProgressBar';
import { subscribeToTaskProgress } from '../services/taskProgress';
import { toMs } from '../utils/dateUtils';
import { useTasks } from '../contexts/TasksContext';
import { predictDelayRisk, riskLevelDisplay } from '../utils/aiFeatures';

const Swipeable = getSwipeable();


const TaskItem = memo(function TaskItem({
  task,
  onPress,
  onDelete,
  onToggleComplete,
  onDuplicate,
  onShare,
  onChangeStatus,
  onReopen,
  onChat,
  currentUserRole = 'director',
  index = 0,
  compact = false,  // 📱 Vista compacta para mostrar más tareas
  isDeleting: isDeleteProp = false  // ⚡ Prop para que el padre pueda controlar si se está borrando
}) {
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useResponsive();
  const { tasks: allTasks } = useTasks();
  const isSmallDevice = screenWidth < 400;
  const [now, setNow] = useState(Date.now());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progressData, setProgressData] = useState(null);
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const deletePulseAnim = useRef(new Animated.Value(0)).current;
  const statusDotAnim = useRef(new Animated.Value(1)).current;

  // Suscribir a cambios de progreso en tiempo real
  useEffect(() => {
    if (!task.id) return;
    
    const unsubscribe = subscribeToTaskProgress(task.id, (data) => {
      setProgressData(data);
    });

    return () => unsubscribe();
  }, [task.id]);
  
  useEffect(() => {
    // Animación de entrada escalonada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  // Animación de pulso cuando se está borrando
  useEffect(() => {
    if (!isDeleteProp) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(deletePulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(deletePulseAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isDeleteProp, deletePulseAnim]);
  
  // Pulsing dot for in-process tasks
  useEffect(() => {
    if (task.status !== 'en_proceso' && task.status !== 'en-progreso') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(statusDotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(statusDotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [task.status, statusDotAnim]);

  // Optimización: Solo actualizar el tiempo cada 60 segundos y solo si la tarea no está cerrada
  useEffect(() => {
    if (task.status === 'cerrada') return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [task.status]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = (event) => {
    hapticMedium();
    if (Platform.OS === 'web') {
      // En web, .measure() no está disponible — usar posición del evento
      const { pageX = 0, pageY = 0 } = event.nativeEvent || {};
      setMenuPosition({ x: pageX + 10, y: pageY + 10 });
      setShowContextMenu(true);
    } else {
      event.nativeEvent.target.measure((fx, fy, width, height, px, py) => {
        setMenuPosition({ x: px + 10, y: py + height + 5 });
        setShowContextMenu(true);
      });
    }
  };

  // Construir acciones del menú basadas en permisos disponibles
  const menuActions = [
    // Solo mostrar duplicar si el callback está disponible (admin)
    ...(onDuplicate ? [{ icon: 'copy-outline', label: 'Duplicar tarea', onPress: () => { hapticMedium(); onDuplicate(task); } }] : []),
    { icon: 'share-outline', label: 'Compartir', onPress: () => { hapticMedium(); onShare && onShare(task); } },
    // Reabrir solo para admin si está cerrada
    ...(onReopen && task.status === 'cerrada' ? [{ icon: 'refresh-outline', label: 'Reabrir tarea', onPress: () => { hapticMedium(); onReopen(task); } }] : []),
    // Solo mostrar eliminar si el callback está disponible (solo admin) y no está en progreso
    ...(onDelete ? [{ icon: 'trash-outline', label: 'Eliminar', danger: true, onPress: () => { hapticMedium(); setShowDeleteDialog(true); } }] : [])
  ];

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    const isClosedAndNotAdmin = task.status === 'cerrada' && currentUserRole !== 'admin';
    
    return (
      <TouchableOpacity
        style={styles.completeAction}
        onPress={() => !isClosedAndNotAdmin && (onToggleComplete && onToggleComplete())}
        activeOpacity={isClosedAndNotAdmin ? 0.5 : 0.9}
        disabled={isClosedAndNotAdmin}
        accessibilityLabel={task.status === 'cerrada' ? 'Reabrir tarea' : 'Marcar como completada'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isClosedAndNotAdmin }}
      >
        <View style={[
          styles.actionGradient, 
          { 
            backgroundColor: task.status === 'cerrada' ? theme.info : theme.success,
            opacity: isClosedAndNotAdmin ? 0.4 : 1
          }
        ]}>
          <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
            <Ionicons name={task.status === 'cerrada' ? 'refresh' : 'checkmark-circle'} size={28} color="#FFF" />
            <Text style={styles.actionText}>{task.status === 'cerrada' ? 'Reabrir' : 'Completar'}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          if (isDeleting) return;
          if (onDelete) setShowDeleteDialog(true);
        }}
        activeOpacity={0.9}
        disabled={isDeleting}
        accessibilityLabel="Eliminar tarea"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
      >
        <View style={[styles.actionGradient, { backgroundColor: theme.error, opacity: isDeleting ? 0.5 : 1 }]}>
          <Animated.View style={[styles.actionContent, { transform: [{ scale }] }]}>
            <Ionicons name="trash" size={28} color="#FFF" />
            <Text style={styles.actionText}>Eliminar</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const getDueStatus = () => {
    const due = toMs(task.dueAt);
    const remaining = due - now;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (remaining <= 0) {
      return { topBorderColor: theme.error, status: 'vencida' };
    } else if (remaining <= oneDayMs) {
      return { topBorderColor: theme.warning, status: 'proxima' };
    }
    return { topBorderColor: 'transparent', status: 'normal' };
  };

  const getRelativeDueLabel = () => {
    if (!task.dueAt) return null;
    const due = toMs(task.dueAt);
    const diff = due - now;
    const abs = Math.abs(diff);
    const mins = Math.floor(abs / 60000);
    const hours = Math.floor(abs / 3600000);
    const days = Math.floor(abs / 86400000);
    if (diff < 0) {
      if (days >= 1) return `HACE ${days}d`;
      if (hours >= 1) return `HACE ${hours}h`;
      return `HACE ${mins}m`;
    }
    if (days >= 1) return `EN ${days}d`;
    if (hours >= 1) return `EN ${hours}h`;
    return `EN ${mins}m`;
  };

  const relativeDueLabel = getRelativeDueLabel();

  const dueStatus = getDueStatus();

  const statusAccentColor = task.status === 'cerrada'
    ? theme.success
    : task.status === 'en_proceso' || task.status === 'en-progreso'
      ? theme.info
      : task.status === 'en_revision'
        ? theme.secondary
        : dueStatus.status === 'vencida'
          ? theme.error
          : dueStatus.status === 'proxima'
            ? theme.warning
            : theme.primary;

  // IA Feature 5: Alerta predictiva de retraso
  // Usar el conteo de tareas como proxy para cambios (evita recompute O(n²) con cada update)
  const allTasksCount = allTasks?.length ?? 0;
  const delayRisk = useMemo(() => {
    if (task.status === 'cerrada' || compact) return null;
    const risk = predictDelayRisk(task, allTasks);
    return risk.level !== 'low' ? { ...risk, display: riskLevelDisplay(risk.level) } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status, task.dueAt, task.priority, task.assignedTo, task.area, allTasksCount, compact]);

  // Estilos compactos
  const compactStyles = compact ? {
    container: { paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 12, marginVertical: 4 },
    title: { fontSize: 14 },
    avatar: { width: 28, height: 28 },
    meta: { fontSize: 11 },
    hideCoordination: true,
    hideButtons: true, // Ocultar botones de acción en vista compacta
  } : {};

  return (
    <>
      <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} friction={1.5} overshootFriction={8}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <GlassView
            intensity={isDark ? 45 : 65}
            tint={isDark ? 'dark' : 'light'}
            noBlur
            style={[
              styles.container,
              {
                backgroundColor: task.status === 'cerrada'
                  ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
                  : (isDark ? theme.card : '#FFFFFF'),
                borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)',
                shadowColor: '#000000',
                opacity: isDeleteProp ? 0.6 : 1,
              },
              task.status === 'cerrada' && { opacity: isDeleteProp ? 0.6 : 0.75 },
              compact && compactStyles.container
            ]}
          >
            {/* Barra superior de acento por estado */}
            <View
              pointerEvents="none"
              style={[styles.topAccentBar, { backgroundColor: statusAccentColor }]}
            />
            {/* Indicador prominente de "BORRANDO..." */}
            {isDeleteProp && (
              <Animated.View style={[
                styles.deletingOverlay, 
                { 
                  backgroundColor: theme.error,
                  opacity: deletePulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1]
                  })
                }
              ]}>
                <ActivityIndicator 
                  size="large" 
                  color="#FFFFFF" 
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={styles.deletingTextBold}>
                    ¡BORRANDO!
                  </Text>
                  <Text style={styles.deletingTextSmall}>
                    Por favor espera...
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Indicador de vencimiento - badge de alerta */}
            {dueStatus.status !== 'normal' && (
              <View 
                style={[
                  styles.dueAlert,
                  { backgroundColor: dueStatus.topBorderColor }
                ]}
              >
                <Ionicons 
                  name={dueStatus.status === 'vencida' ? 'alert-circle' : 'time'} 
                  size={14} 
                  color="#FFF" 
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.dueAlertText}>
                  {relativeDueLabel || (dueStatus.status === 'vencida' ? 'VENCIDA' : 'VENCE')}
                </Text>
              </View>
            )}
            <View style={styles.contentRow}>
              {/* Contenido principal a la izquierda */}
              <View style={styles.taskContent}>
                {/* Área tappable: título, meta, tags, riesgo */}
                <TouchableOpacity
                  onPress={() => { hapticMedium(); onPress && onPress(task); }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onLongPress={handleLongPress}
                  delayLongPress={500}
                  activeOpacity={0.9}
                  accessibilityLabel={`Tarea: ${task.title}. Área: ${task.area || 'Sin área'}. Estado: ${task.status === 'cerrada' ? 'Completada' : task.status === 'en_proceso' ? 'En progreso' : task.status === 'en_revision' ? 'En revisión' : 'Pendiente'}.`}
                  accessibilityRole="button"
                  accessibilityHint="Toca para ver el detalle de la tarea"
                >
                  {/* Fila 1: Avatar + Título + Status dot */}
                  <View style={styles.row}>
                    {task.assignedToNames && task.assignedToNames.length > 0 && (
                      <Avatar
                        name={task.assignedToNames[0]}
                        size={compact ? 24 : (isSmallDevice ? 32 : 36)}
                        style={styles.avatar}
                        showBorder
                      />
                    )}
                    {(task.status === 'en_proceso' || task.status === 'en-progreso') && (
                      <Animated.View style={[styles.statusDot, { backgroundColor: theme.info, shadowColor: theme.info, opacity: statusDotAnim }]} />
                    )}
                    {task.status === 'en_revision' && (
                      <View style={[styles.statusDot, { backgroundColor: theme.secondary, shadowColor: theme.secondary }]} />
                    )}
                    <Text
                      style={[
                        styles.title,
                        { color: theme.text },
                        task.status === 'cerrada' && styles.titleCompleted,
                        compact && { fontSize: 14 }
                      ]}
                      numberOfLines={compact ? 1 : 2}
                    >
                      {task.title}
                    </Text>
                  </View>

                  {/* Fila 2: Área • Asignado (simplificado en compacto) */}
                  <Text
                    style={[
                      styles.meta,
                      { color: theme.textSecondary },
                      compact && { fontSize: 11, marginTop: 2 }
                    ]}
                    numberOfLines={1}
                  >
                    {compact
                      ? `${task.area || 'Sin área'} • ${task.status === 'cerrada' ? '✓ Completada' : task.status === 'en_progreso' ? '▶ En progreso' : task.status === 'en_revision' ? '👁 Revisión' : '⏳ Pendiente'}`
                      : `${task.area || 'Sin área'} • ${task.assignedToNames?.length > 0 ? task.assignedToNames.join(', ') : 'Sin asignar'}`
                    }
                  </Text>

                  {/* Indicador de Tarea Multi-Área (Coordinación) - Oculto en compacto */}
                  {!compact && task.isCoordinationTask && (
                    <View style={[styles.coordinationBadge, { backgroundColor: theme.secondaryDark + '20', borderColor: theme.secondary }]}>
                      <Ionicons name="git-branch" size={14} color={theme.secondary} />
                      <Text style={[styles.coordinationText, { color: theme.secondary }]}>
                        Coordinación: {task.coordinationProgress || 0}% ({task.subtasksCompleted || 0}/{task.subtaskCount || 0} áreas)
                      </Text>
                    </View>
                  )}

                  {/* Fila 3: Estado - Oculto en compacto */}
                  {!compact && (
                    <Text style={[styles.statusText, { color: theme.textTertiary }]} numberOfLines={1}>
                      {task.status === 'en_progreso' ? 'En progreso' : task.status === 'en_revision' ? 'En revisión' : task.status === 'cerrada' ? 'Completada' : 'Pendiente'}
                    </Text>
                  )}

                  {/* Fila 3.5: Etiquetas - Oculto en compacto */}
                  {!compact && task.tags && task.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {task.tags.slice(0, 3).map((tag, idx) => (
                        <View key={idx} style={[styles.tagChip, { backgroundColor: theme.primaryLight || 'rgba(159,34,65,0.1)' }]}>
                          <Text style={[styles.tagText, { color: theme.primary }]}>#{tag}</Text>
                        </View>
                      ))}
                      {task.tags.length > 3 && (
                        <Text style={[styles.tagMore, { color: theme.textSecondary }]}>+{task.tags.length - 3}</Text>
                      )}
                    </View>
                  )}

                  {/* IA Feature 5: Badge de riesgo de retraso */}
                  {delayRisk && (
                    <View style={[styles.riskBadge, { backgroundColor: delayRisk.display.color + '18', borderColor: delayRisk.display.color }]}>
                      <Ionicons name={delayRisk.display.icon} size={12} color={delayRisk.display.color} />
                      <Text style={[styles.riskBadgeText, { color: delayRisk.display.color }]}>
                        {delayRisk.display.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Fila 4: Botones de Acción Rápida — FUERA del TouchableOpacity para evitar <button> anidado en web */}
                {!compact && onChangeStatus && task.status !== 'cerrada' && (
                  <View style={styles.quickActionsRow}>
                    {task.status === 'pendiente' && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.infoAlpha, borderColor: theme.info }]}
                        onPress={() => { hapticMedium(); onChangeStatus(task, 'en_proceso'); }}
                        activeOpacity={0.7}
                        accessibilityLabel="Iniciar tarea"
                        accessibilityRole="button"
                      >
                        <Ionicons name="play-circle" size={16} color={theme.info} />
                        <Text style={[styles.quickActionText, { color: theme.info }]}>Iniciar</Text>
                      </TouchableOpacity>
                    )}
                    {(task.status === 'pendiente' || task.status === 'en_proceso' || task.status === 'en-progreso') && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.secondaryDark + '20', borderColor: theme.secondary }]}
                        onPress={() => { hapticMedium(); onChangeStatus(task, 'en_revision'); }}
                        activeOpacity={0.7}
                        accessibilityLabel="Enviar a revisión"
                        accessibilityRole="button"
                      >
                        <Ionicons name="eye" size={16} color={theme.secondary} />
                        <Text style={[styles.quickActionText, { color: theme.secondary }]}>Revisión</Text>
                      </TouchableOpacity>
                    )}
                    {currentUserRole === 'admin' && (task.status === 'en_proceso' || task.status === 'en-progreso' || task.status === 'en_revision') && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.successAlpha, borderColor: theme.success }]}
                        onPress={() => { hapticMedium(); onChangeStatus(task, 'cerrada'); }}
                        activeOpacity={0.7}
                        accessibilityLabel="Cerrar tarea"
                        accessibilityRole="button"
                      >
                        <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                        <Text style={[styles.quickActionText, { color: theme.success }]}>Cerrar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Fila 5: Barra de Progreso (EN TIEMPO REAL) — FUERA del TouchableOpacity */}
                {!compact && progressData && progressData.subtaskStats && progressData.subtaskStats.total > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                        Progreso
                      </Text>
                      <Text style={[styles.progressValue, { color: theme.primary }]}>
                        {progressData.subtaskStats.completada}/{progressData.subtaskStats.total}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={progressData.overallProgress}
                      size="small"
                      showLabel={true}
                      color={progressData.isComplete ? theme.success : theme.primary}
                    />
                  </View>
                )}
              </View>
              
              {/* Acciones a la derecha: Chat + Delete */}
              <View style={styles.actionsRow}>
                {onChat && (
                  <TouchableOpacity
                    onPress={() => { hapticLight(); onChat(task); }}
                    style={[styles.chatButton, task.hasUnreadMessages && { backgroundColor: theme.info + '22', borderColor: theme.info + '60' }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                    accessibilityLabel="Abrir chat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubble-outline" size={isSmallDevice ? 16 : 18} color={task.hasUnreadMessages ? theme.info : theme.textSecondary} />
                    {task.hasUnreadMessages && (
                      <View style={[styles.chatUnreadDot, { backgroundColor: theme.info }]} />
                    )}
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => {
                      if (isDeleting) return;
                      hapticMedium();
                      setShowDeleteDialog(true);
                    }}
                    style={[styles.deleteButton, isSmallDevice && styles.deleteButtonSmall]}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    activeOpacity={isDeleting ? 0.3 : 0.7}
                    disabled={isDeleting}
                  >
                    <Ionicons name="trash-outline" size={isSmallDevice ? 18 : 22} color={isDeleting ? "#CCC" : theme.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </GlassView>
        </Animated.View>
      </Swipeable>
      <ContextMenu visible={showContextMenu} onClose={() => setShowContextMenu(false)} position={menuPosition} actions={menuActions} />
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Eliminar tarea"
        message="¿Estás seguro de que quieres eliminar esta tarea?"
        icon="trash"
        iconColor={theme.error}
        danger
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={false}
        onConfirm={() => {
          // 🛡️ GUARD: Prevenir múltiples clics
          if (isDeleting) return;
          
          // ⚡ CERRAR INMEDIATAMENTE - ANTES que nada
          setShowDeleteDialog(false);
          setIsDeleting(true);
          
          // 🔄 Ejecutar delete en background
          setTimeout(() => {
            if (onDelete) {
              Promise.resolve(onDelete())
                .catch(_err => {
                  // Delete handler error caught
                })
                .finally(() => setIsDeleting(false));
            } else {
              setIsDeleting(false);
            }
          }, 200); // Pequeño delay para asegurar que el dialog cerró
        }}
        onCancel={() => {
          if (!isDeleting) {
            setShowDeleteDialog(false);
          }
        }}
      />
    </>
  );
});

export default TaskItem;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
    position: 'relative',
    overflow: 'hidden',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 2,
    pointerEvents: 'none',
  },
  dueAlert: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  dueAlertText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    marginRight: 8,
  },
  title: { 
    fontSize: 15, 
    fontWeight: '700', 
    flex: 1, 
    marginRight: 8,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '800',
    minWidth: 60,
    textAlign: 'center',
    letterSpacing: -0.2
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6,
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  meta: { 
    fontSize: 13, 
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  coordinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  coordinationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaSmall: { 
    fontSize: 12,
    fontWeight: '600',
    color: '#999'
  },
  priorityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  priorityBadge: { 
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '500',
    fontStyle: 'italic',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagMore: {
    fontSize: 11,
    fontWeight: '500',
    paddingVertical: 3,
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 4
  },
  progressSection: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  completeAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 12,
    marginRight: 16,
    overflow: 'hidden'
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 12,
    marginLeft: 16,
    overflow: 'hidden'
  },
  actionGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  taskContent: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  chatButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    minWidth: 38,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatUnreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,59,48,0.20)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  deleteButtonSmall: {
    padding: 6,
    minWidth: 34,
    minHeight: 34,
  },
  // ⚡ ESTILOS PARA INDICADOR DE BORRANDO
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 12,
  },
  deletingTextBold: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  deletingText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deletingTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
    opacity: 0.9,
  },
  actionsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  // Botones de acción rápida
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 5,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
