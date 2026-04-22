/**
 * TaskCard.js
 * Tarjeta de tarea para listas — HomeScreen, etc.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const PRIORITY_CONFIG = {
  baja:    { color: '#34C759', label: 'Baja',    icon: 'arrow-down' },
  media:   { color: '#FF9500', label: 'Media',   icon: 'remove'     },
  alta:    { color: '#FF6B00', label: 'Alta',    icon: 'arrow-up'   },
  critica: { color: '#FF3B30', label: 'Crítica', icon: 'alert'      },
};

const STATUS_CONFIG = {
  pendiente:   { color: '#8E8E93', label: 'Pendiente'   },
  en_progreso: { color: '#007AFF', label: 'En Proceso'  },
  en_proceso:  { color: '#007AFF', label: 'En Proceso'  },
  revision:    { color: '#AF52DE', label: 'En Revisión' },
  en_revision: { color: '#AF52DE', label: 'En Revisión' },
  completado:  { color: '#34C759', label: 'Completado'  },
  cerrado:     { color: '#34C759', label: 'Cerrado'     },
  cerrada:     { color: '#34C759', label: 'Cerrada'     },
  bloqueado:   { color: '#FF3B30', label: 'Bloqueado'   },
};

export default function TaskCard({
  task = {},
  onPress = () => {},
  onLongPress = () => {},
}) {
  const { theme, isDark } = useTheme();

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const status   = STATUS_CONFIG[task.status]     || { color: '#8E8E93', label: task.status || 'Sin estado' };

  const isOverdue = task.isDueOverdue && task.status !== 'cerrada' && task.status !== 'completado' && task.status !== 'cerrado';
  const accentColor = isOverdue ? '#FF3B30' : priority.color;

  const dueDate = task.dueAt
    ? new Date(task.dueAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
      accessible={true}
      accessibilityLabel={`Tarea: ${task.title}`}
      accessibilityHint={`Prioridad: ${task.priority}, Estado: ${task.status}`}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.card : '#FFFFFF',
            borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.08)',
            shadowColor: '#000000',
          },
        ]}
      >
        {/* Left accent bar — colored by priority (or red if overdue) */}
        <View style={[styles.leftBar, { backgroundColor: accentColor }]} />

        <View style={styles.inner}>
          {/* Header: Title + Status badge */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: status.color + (isDark ? '30' : '18'),
                borderColor:     status.color + (isDark ? '60' : '45'),
              }
            ]}>
              <Text style={[styles.statusText, { color: status.color }]}>
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

          {/* Footer meta row */}
          <View style={[
            styles.footer,
            { borderTopColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }
          ]}>
            {/* Priority pill */}
            <View style={[styles.priorityPill, { backgroundColor: accentColor + (isDark ? '28' : '18'), borderColor: accentColor + '60' }]}>
              <View style={[styles.priorityDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.priorityText, { color: accentColor }]}>
                {isOverdue ? 'VENCIDA' : priority.label}
              </Text>
            </View>

            {/* Assignees */}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {task.assignedTo.length}
                </Text>
              </View>
            )}

            {/* Subtasks / areas count */}
            {task.areas && task.areas.length > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {task.areas.length}
                </Text>
              </View>
            )}

            {/* Due date — red if overdue */}
            {!!dueDate && (
              <View style={styles.metaChip}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={isOverdue ? '#FF3B30' : theme.textSecondary}
                />
                <Text style={[
                  styles.metaText,
                  { color: isOverdue ? '#FF3B30' : theme.textSecondary },
                  isOverdue && { fontWeight: '700' },
                ]}>
                  {dueDate}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginVertical: 5,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
  },
  leftBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 8,
  },
  header: {
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
    paddingHorizontal: 8,
    borderRadius: 99,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    flexWrap: 'wrap',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
