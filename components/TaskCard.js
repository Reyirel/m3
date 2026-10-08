import React, { memo, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';
import { isClosed as isClosedStatus, priorityColor, priorityLabel, statusColor as getStatusColor, statusLabel } from '../utils/taskStatus';
import { SPRING, spring } from '../theme/motion';

const EMPTY_TASK = {};

// Tarjeta de tarea. `onPress` y `onLongPress` reciben la tarea, así la lista puede pasar
// siempre las mismas funciones y la tarjeta no se vuelve a dibujar sin necesidad.
function TaskCard({ task = EMPTY_TASK, onPress, onLongPress }) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);

  const handlePressIn = useCallback(() => {
    spring(scaleAnim, 0.97, SPRING.press).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    spring(scaleAnim, 1, SPRING.press).start();
  }, [scaleAnim]);

  const isClosed = isClosedStatus(task.status);
  const isOverdue = task.dueAt && toMs(task.dueAt) < Date.now() && !isClosed;

  // La barra lateral lleva el color del estado (rojo si está vencida);
  // la prioridad va en su propia etiqueta
  const statusColor = getStatusColor(task.status, theme);
  const accentColor = isOverdue ? theme.error : statusColor;
  const pillColor = isOverdue ? theme.error : isClosed ? theme.statusClosed : priorityColor(task.priority, theme);

  const dueDate = (() => {
    if (!task.dueAt) return null;
    const ms = toMs(task.dueAt);
    const diffDays = Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays > 1 && diffDays < 7) return `en ${diffDays}d`;
    if (diffDays < 0 && diffDays > -7) return `hace ${Math.abs(diffDays)}d`;
    return new Date(ms).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  })();

  return (
    <TouchableOpacity
      onPress={() => onPress?.(task)}
      onLongPress={onLongPress ? () => onLongPress(task) : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Tarea: ${task.title}`}
      accessibilityHint={`Prioridad ${priorityLabel(task.priority)}, estado ${statusLabel(task.status)}${isOverdue ? ', vencida' : ''}`}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      } : {})}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.card : theme.glassStrong,
            borderColor: hovered
              ? accentColor + '60'
              : isOverdue
              ? theme.error + '40'
              : isClosed
              ? theme.success + '30'
              : theme.glassBorder,
            shadowColor: isOverdue ? theme.error : hovered ? accentColor : theme.shadowColor,
            shadowOpacity: hovered ? 0.18 : 0.09,
            shadowRadius: hovered ? 20 : 12,
            opacity: isClosed ? 0.72 : 1,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Left accent bar */}
        <LinearGradient
          colors={[accentColor, accentColor + '88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.leftBar}
        />

        <View style={styles.inner}>
          {/* Title + status badge */}
          <View style={styles.titleRow}>
            {isClosed && (
              <Ionicons name="checkmark-circle" size={18} color={theme.success} style={{ marginTop: 1 }} />
            )}
            <Text style={[styles.title, { color: isClosed ? theme.textSecondary : theme.text, textDecorationLine: isClosed ? 'line-through' : 'none' }]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor + (isDark ? '30' : '18'),
                borderColor: statusColor + (isDark ? '55' : '40'),
              },
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel(task.status).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Description */}
          {!!task.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
              {task.description}
            </Text>
          )}

          {/* Meta row */}
          <View style={[styles.footer, { borderTopColor: theme.glassBorder }]}>
            {/* Priority / overdue pill */}
            <View style={[styles.pill, { backgroundColor: pillColor + '18', borderColor: pillColor + '55' }]}>
              <View style={[styles.dot, { backgroundColor: pillColor }]} />
              <Text style={[styles.pillText, { color: pillColor }]}>
                {isOverdue ? 'VENCIDA' : isClosed ? 'CERRADA' : priorityLabel(task.priority).toUpperCase()}
              </Text>
            </View>

            {/* Area tag */}
            {!!task.area && (
              <View style={[styles.pill, { backgroundColor: theme.primaryAlpha || 'rgba(159,34,65,0.10)', borderColor: theme.primary + '30' }]}>
                <Ionicons name="layers-outline" size={12} color={theme.primary} />
                <Text style={[styles.pillText, { color: theme.primary }]} numberOfLines={1}>
                  {task.area.length > 14 ? task.area.slice(0, 13) + '…' : task.area}
                </Text>
              </View>
            )}

            {/* Assignees */}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <View style={styles.meta}>
                <Ionicons name="people-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.metaText, { color: theme.textTertiary }]}>
                  {Array.isArray(task.assignedTo) ? task.assignedTo.length : 1}
                </Text>
              </View>
            )}

            {/* Áreas: solo cuando son varias (con una sola ya está la etiqueta del área) */}
            {task.areas && task.areas.length > 1 && (
              <View style={styles.meta}>
                <Ionicons name="layers-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.metaText, { color: theme.textTertiary }]}>
                  {task.areas.length}
                </Text>
              </View>
            )}

            {/* Due date */}
            {!!dueDate && (
              <View style={styles.meta}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={isOverdue ? theme.error : theme.textTertiary}
                />
                <Text style={[
                  styles.metaText,
                  { color: isOverdue ? theme.error : theme.textTertiary },
                  isOverdue && { fontWeight: '700' },
                ]}>
                  {dueDate}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default memo(TaskCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginVertical: 5,
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
  },
  leftBar: {
    width: 4,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 99,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
