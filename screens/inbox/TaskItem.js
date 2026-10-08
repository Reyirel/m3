// screens/inbox/TaskItem.js
// TaskItem moderno con animaciones y glassmorphism - Compatible con web
import React, { useEffect, useState, memo, useRef, useMemo } from 'react';
import { TouchableOpacity, View, Text, Animated, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassView } from '../../utils/GlassView';
import { useResponsive } from '../../utils/responsive';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getSwipeable } from '../../utils/platformComponents';
import ContextMenu from './ContextMenu';
import { confirmAlert } from '../../utils/alert';
import Avatar from '../../components/Avatar';
import ProgressBar from '../../components/ProgressBar';
import { toMs } from '../../utils/dateUtils';
import { useTasks } from '../../contexts/TasksContext';
import { useChatUnread } from '../../hooks/useChatUnread';
import { predictDelayRisk, riskLevelDisplay } from '../../utils/aiFeatures';
import { isInProgress, statusColor, statusLabel } from '../../utils/taskStatus';
import { useNow } from '../../hooks/useNow';
import { DURATION, PRESS_SCALE, SPRING, loop, spring, timing } from '../../theme/motion';
import { styles } from './TaskItemStyles';

const Swipeable = getSwipeable();

// Botones apilados en el teléfono: un margen mayor haría que uno tape al otro
const PHONE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
// Etiquetas visibles por tarjeta; el resto se resume como "+N"
const MAX_TAGS = 2;


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
  compact = false,  // 📱 Vista compacta para mostrar más tareas
  isDeleting: isDeleteProp = false  // ⚡ Prop para que el padre pueda controlar si se está borrando
}) {
  const { theme, isDark } = useTheme();
  const { width: screenWidth, isMobile } = useResponsive();
  const { tasks: allTasks } = useTasks();
  // Mensajes sin leer para ESTE usuario (no un indicador único por tarea)
  const hasUnreadChat = useChatUnread(task);
  const isSmallDevice = screenWidth < 400;
  // En el teléfono el aviso de vencimiento va dentro del texto (no encima del título)
  // y los botones se apilan para dejarle el ancho al contenido
  const inlineDue = isMobile && !compact;
  // Hora compartida que avanza cada minuto (las tareas cerradas no la necesitan)
  const now = useNow(task.status !== 'cerrada');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmación con el diálogo común de la app (components/DialogHost.js)
  const askDelete = () => confirmAlert(
    'Eliminar tarea',
    'La tarea se moverá a la papelera.',
    () => {
      if (isDeleting || !onDelete) return;
      setIsDeleting(true);
      Promise.resolve(onDelete(task)).catch(() => {}).finally(() => setIsDeleting(false));
    },
    'Eliminar'
  );

  // Avance por subtareas: viene en la propia tarea (lo mantiene recalculateTaskProgress).
  // Antes cada fila abría su propia suscripción a las subtareas.
  const progress = typeof task.progressPercentage === 'number'
    ? { percent: task.progressPercentage, total: task.subtasksTotal, done: task.subtasksDone }
    : null;

  // Las filas no animan su entrada: la lista las recicla al desplazarse y la animación
  // se repetía cada vez que una fila volvía a la pantalla.
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const deletePulseAnim = useRef(new Animated.Value(0)).current;

  // Pulso mientras se está borrando
  useEffect(() => {
    if (!isDeleteProp) return undefined;
    const pulse = loop(
      Animated.sequence([
        timing(deletePulseAnim, 1, { duration: DURATION.slow }),
        timing(deletePulseAnim, 0, { duration: DURATION.slow }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isDeleteProp, deletePulseAnim]);

  const handlePressIn = () => {
    spring(scaleAnim, PRESS_SCALE, SPRING.press).start();
  };

  const handlePressOut = () => {
    spring(scaleAnim, 1, SPRING.press).start();
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
    ...(onDelete ? [{ icon: 'trash-outline', label: 'Eliminar', danger: true, onPress: () => { hapticMedium(); askDelete(); } }] : [])
  ];

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    const isClosedAndNotAdmin = task.status === 'cerrada' && currentUserRole !== 'admin';
    
    return (
      <TouchableOpacity
        style={styles.completeAction}
        onPress={() => !isClosedAndNotAdmin && !isDeleteProp && (onToggleComplete && onToggleComplete(task))}
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
          if (onDelete) askDelete();
        }}
        activeOpacity={0.7}
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

  // Mismo criterio que la tarjeta de Inicio: color del estado, rojo si está vencida
  const statusAccentColor = task.status !== 'cerrada' && dueStatus.status === 'vencida'
    ? theme.error
    : statusColor(task.status, theme);

  // IA Feature 5: Alerta predictiva de retraso
  // Usar el conteo de tareas como proxy para cambios (evita recompute O(n²) con cada update)
  const allTasksCount = allTasks?.length ?? 0;
  const delayRisk = useMemo(() => {
    if (task.status === 'cerrada' || compact) return null;
    const risk = predictDelayRisk(task, allTasks);
    return risk.level !== 'low' ? { ...risk, display: riskLevelDisplay(risk.level) } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status, task.dueAt, task.priority, task.assignedTo, task.area, allTasksCount, compact]);

  const dueBadge = dueStatus.status !== 'normal' ? (
    <View style={[inlineDue ? styles.dueChip : styles.dueAlert, { backgroundColor: dueStatus.topBorderColor }]}>
      <Ionicons
        name={dueStatus.status === 'vencida' ? 'alert-circle' : 'time'}
        size={inlineDue ? 12 : 14}
        color="#FFF"
        style={{ marginRight: 4 }}
      />
      <Text style={styles.dueAlertText}>
        {relativeDueLabel || (dueStatus.status === 'vencida' ? 'VENCIDA' : 'VENCE')}
      </Text>
    </View>
  ) : null;

  const showQuickActions = !!onChangeStatus && task.status !== 'cerrada';
  // En el teléfono chat y eliminar van al pie de la tarjeta, junto a las acciones:
  // una columna a la derecha le quitaba ancho al título
  const footerIcons = isMobile && !compact && (!!onChat || !!onDelete);
  const actionIcons = (
    <>
      {onChat && (
        <TouchableOpacity
          onPress={() => { hapticLight(); onChat(task); }}
          style={[styles.chatButton, isMobile && styles.actionBtnPhone, hasUnreadChat && { backgroundColor: theme.info + '22', borderColor: theme.info + '60' }]}
          hitSlop={isMobile ? PHONE_HIT_SLOP : { top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          accessibilityLabel="Abrir chat"
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-outline" size={18} color={hasUnreadChat ? theme.info : theme.textSecondary} />
          {hasUnreadChat && (
            <View style={[styles.chatUnreadDot, { backgroundColor: theme.info }]} />
          )}
        </TouchableOpacity>
      )}
      {onDelete && !(isMobile && compact) && (
        <TouchableOpacity
          onPress={() => {
            if (isDeleting) return;
            hapticMedium();
            askDelete();
          }}
          style={[styles.deleteButton, isMobile && styles.actionBtnPhone]}
          hitSlop={isMobile ? PHONE_HIT_SLOP : { top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={isDeleting ? 0.3 : 0.7}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="Eliminar"
        >
          <Ionicons name="trash-outline" size={isMobile ? 18 : 22} color={isDeleting ? "#CCC" : theme.error} />
        </TouchableOpacity>
      )}
    </>
  );

  // Estilos compactos
  const compactStyles = compact ? {
    container: { paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 12, marginVertical: 4 },
    title: { fontSize: 14 },
    avatar: { width: 28, height: 28 },
    meta: { fontSize: 12 },
    hideCoordination: true,
    hideButtons: true, // Ocultar botones de acción en vista compacta
  } : {};

  return (
    <>
      <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} friction={1.5} overshootFriction={8}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
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
                borderColor: theme.glassBorder,
                shadowColor: '#000000',
                opacity: isDeleteProp ? 0.6 : 1,
              },
              task.status === 'cerrada' && { opacity: isDeleteProp ? 0.6 : 0.75 },
              isMobile && styles.containerPhone,
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

            {!inlineDue && dueBadge}
            <View style={[styles.contentRow, isMobile && styles.contentRowPhone]}>
              {/* Contenido principal a la izquierda */}
              <View style={styles.taskContent}>
                {/* Área tappable: título, meta, tags, riesgo */}
                <TouchableOpacity
                  onPress={() => { if (isDeleteProp) return; hapticMedium(); onPress && onPress(task); }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onLongPress={handleLongPress}
                  delayLongPress={500}
                  activeOpacity={0.7}
                  accessibilityLabel={`Tarea: ${task.title}. Área: ${task.area || 'Sin área'}. Estado: ${statusLabel(task.status)}.`}
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
                    {isInProgress(task.status) && (
                      <View style={[styles.statusDot, { backgroundColor: theme.statusInProgress, shadowColor: theme.statusInProgress }]} />
                    )}
                    {task.status === 'en_revision' && (
                      <View style={[styles.statusDot, { backgroundColor: theme.statusReview, shadowColor: theme.statusReview }]} />
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
                      compact && { fontSize: 12, marginTop: 2 }
                    ]}
                    numberOfLines={1}
                  >
                    {compact
                      ? `${task.area || 'Sin área'} • ${statusLabel(task.status)}`
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

                  {/* Fila 3: estado, vencimiento, riesgo y etiquetas en una sola fila que se acomoda */}
                  {!compact && (
                    <View style={styles.badgesRow}>
                      <Text style={[styles.statusTextInline, { color: theme.textTertiary }]} numberOfLines={1}>
                        {statusLabel(task.status)}
                      </Text>
                      {inlineDue && dueBadge}
                      {delayRisk && (
                        <View style={[styles.riskBadge, { backgroundColor: delayRisk.display.color + '18', borderColor: delayRisk.display.color }]}>
                          <Ionicons name={delayRisk.display.icon} size={12} color={delayRisk.display.color} />
                          <Text style={[styles.riskBadgeText, { color: delayRisk.display.color }]}>
                            {delayRisk.display.label}
                          </Text>
                        </View>
                      )}
                      {(task.tags || []).slice(0, MAX_TAGS).map((tag, idx) => (
                        <View key={idx} style={[styles.tagChip, { backgroundColor: theme.primaryAlpha }]}>
                          <Text style={[styles.tagText, { color: theme.primary }]} numberOfLines={1}>#{tag}</Text>
                        </View>
                      ))}
                      {(task.tags || []).length > MAX_TAGS && (
                        <Text style={[styles.tagMore, { color: theme.textSecondary }]}>+{task.tags.length - MAX_TAGS}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Avance por subtareas: barra y valor en una sola línea */}
                {!compact && progress && (
                  <View
                    style={styles.progressRow}
                    accessible
                    accessibilityLabel={`Avance ${progress.percent}%`}
                  >
                    <View style={styles.progressBarWrap}>
                      <ProgressBar
                        progress={progress.percent}
                        size="small"
                        showLabel={false}
                        color={progress.percent === 100 ? theme.success : theme.primary}
                      />
                    </View>
                    <Text style={[styles.progressValue, { color: theme.textSecondary }]}>
                      {progress.total > 0 ? `${progress.done || 0}/${progress.total}` : `${progress.percent}%`}
                    </Text>
                  </View>
                )}
                {/* Acciones — FUERA del TouchableOpacity para evitar <button> anidado en web.
                    En el teléfono chat y eliminar van en esta misma fila, a la derecha. */}
                {!compact && (showQuickActions || footerIcons) && (
                  <View style={styles.footerRow}>
                    <View style={styles.quickActionsRow}>
                      {showQuickActions && (
                        <>
                        {task.status === 'pendiente' && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, isMobile && styles.quickActionBtnPhone, { backgroundColor: theme.statusInProgressBg, borderColor: theme.statusInProgress }]}
                            onPress={() => { hapticMedium(); onChangeStatus(task, 'en_proceso'); }}
                            activeOpacity={0.7}
                            accessibilityLabel="Iniciar tarea"
                            accessibilityRole="button"
                          >
                            <Ionicons name="play-circle" size={16} color={theme.statusInProgress} />
                            <Text style={[styles.quickActionText, { color: theme.statusInProgress }]}>Iniciar</Text>
                          </TouchableOpacity>
                        )}
                        {(task.status === 'pendiente' || isInProgress(task.status)) && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, isMobile && styles.quickActionBtnPhone, { backgroundColor: theme.statusReviewBg, borderColor: theme.statusReview }]}
                            onPress={() => { hapticMedium(); onChangeStatus(task, 'en_revision'); }}
                            activeOpacity={0.7}
                            accessibilityLabel="Enviar a revisión"
                            accessibilityRole="button"
                          >
                            <Ionicons name="eye" size={16} color={theme.statusReview} />
                            <Text style={[styles.quickActionText, { color: theme.statusReview }]}>Revisión</Text>
                          </TouchableOpacity>
                        )}
                        {currentUserRole === 'admin' && (isInProgress(task.status) || task.status === 'en_revision') && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, isMobile && styles.quickActionBtnPhone, { backgroundColor: theme.successAlpha, borderColor: theme.success }]}
                            onPress={() => { hapticMedium(); onChangeStatus(task, 'cerrada'); }}
                            activeOpacity={0.7}
                            accessibilityLabel="Cerrar tarea"
                            accessibilityRole="button"
                          >
                            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                            <Text style={[styles.quickActionText, { color: theme.success }]}>Cerrar</Text>
                          </TouchableOpacity>
                        )}
                        </>
                      )}
                    </View>
                    {footerIcons && <View style={styles.footerIcons}>{actionIcons}</View>}
                  </View>
                )}
              </View>
              
              {/* Chat y eliminar a la derecha (escritorio, o vista compacta) */}
              {!footerIcons && (
                <View style={styles.actionsRow}>{actionIcons}</View>
              )}
            </View>
          </GlassView>
        </Animated.View>
      </Swipeable>
      <ContextMenu visible={showContextMenu} onClose={() => setShowContextMenu(false)} position={menuPosition} actions={menuActions} />
    </>
  );
});

export default TaskItem;
