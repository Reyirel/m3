import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';

const PRIORITY_CONFIG = {
  baja:    { label: 'Baja',    icon: 'arrow-down' },
  media:   { label: 'Media',   icon: 'remove'     },
  alta:    { label: 'Alta',    icon: 'arrow-up'   },
  critica: { label: 'Crítica', icon: 'alert'      },
};

const STATUS_CONFIG = {
  pendiente:   { label: 'Pendiente'   },
  en_progreso: { label: 'En Proceso'  },
  en_proceso:  { label: 'En Proceso'  },
  revision:    { label: 'En Revisión' },
  en_revision: { label: 'En Revisión' },
  completado:  { label: 'Completado'  },
  cerrado:     { label: 'Cerrado'     },
  cerrada:     { label: 'Cerrada'     },
  bloqueado:   { label: 'Bloqueado'   },
};

export default function TaskCard({
  task = {},
  onPress = () => {},
  onLongPress = () => {},
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const status = STATUS_CONFIG[task.status] || { label: task.status || 'Sin estado' };

  const isOverdue = task.dueAt && toMs(task.dueAt) < Date.now() && task.status !== 'cerrada' && task.status !== 'completado' && task.status !== 'cerrado';

  // Accent color from theme
  const accentColor = isOverdue
    ? theme.error
    : task.priority === 'critica' ? theme.error
    : task.priority === 'alta'    ? theme.warning
    : task.priority === 'baja'    ? theme.success
    : theme.statusPending; // media → orange

  const statusColor = task.status === 'cerrada' || task.status === 'completado' ? theme.success
    : task.status === 'en_proceso' || task.status === 'en_progreso' ? theme.statusInProgress
    : task.status === 'en_revision' || task.status === 'revision' ? theme.statusReview
    : task.status === 'bloqueado' ? theme.error
    : theme.statusPending;

  const dueDate = task.dueAt
    ? new Date(toMs(task.dueAt)).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessible
      accessibilityLabel={`Tarea: ${task.title}`}
      accessibilityHint={`Prioridad ${task.priority}, estado ${task.status}`}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.card : theme.glassStrong,
            borderColor: isOverdue
              ? theme.error + '40'
              : isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
            shadowColor: isOverdue ? theme.error : theme.shadowColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.leftBar, { backgroundColor: accentColor }]} />

        <View style={styles.inner}>
          {/* Title + status badge */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
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
                {status.label.toUpperCase()}
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
          <View style={[styles.footer, { borderTopColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)' }]}>
            {/* Priority pill */}
            <View style={[styles.pill, { backgroundColor: accentColor + '18', borderColor: accentColor + '55' }]}>
              <View style={[styles.dot, { backgroundColor: accentColor }]} />
              <Text style={[styles.pillText, { color: accentColor }]}>
                {isOverdue ? 'VENCIDA' : priority.label.toUpperCase()}
              </Text>
            </View>

            {/* Assignees */}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <View style={styles.meta}>
                <Ionicons name="people-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.metaText, { color: theme.textTertiary }]}>
                  {Array.isArray(task.assignedTo) ? task.assignedTo.length : 1}
                </Text>
              </View>
            )}

            {/* Areas */}
            {task.areas && task.areas.length > 0 && (
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
    fontSize: 15,
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
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 13,
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
    fontSize: 9,
    fontWeight: '800',
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
