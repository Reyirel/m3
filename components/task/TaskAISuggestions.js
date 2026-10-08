// components/task/TaskAISuggestions.js
// Sugerencias al crear una tarea: prioridad, fecha límite, área y posibles duplicadas.
// Se calculan solas mientras se escribe el título (utils/aiFeatures.js); cada una dice
// en qué se basa y se aplica con un toque. No hay que pedirlas con un botón.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { ACTIVE_OPACITY } from '../../theme/motion';
import { priorityLabel, statusLabel } from '../../utils/taskStatus';

const formatDate = (date) => new Date(date).toLocaleDateString('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long',
});

export default function TaskAISuggestions({
  suggestions = {},
  onApplyPriority,
  onApplyDueDate,
  onApplyArea,
  onOpenTask,
  isReadOnly = false,
}) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { priority, dueDate, area, similarTasks = [] } = suggestions;

  const rows = [
    priority && {
      key: 'priority',
      icon: 'flag-outline',
      title: `Prioridad ${priorityLabel(priority.priority).toLowerCase()}`,
      reason: priority.reason,
      onApply: onApplyPriority && (() => onApplyPriority(priority.priority)),
    },
    dueDate && {
      key: 'dueDate',
      icon: 'calendar-outline',
      title: `Fecha límite: ${formatDate(dueDate.suggestedDate)}`,
      reason: dueDate.reason,
      onApply: onApplyDueDate && (() => onApplyDueDate(dueDate.suggestedDate)),
    },
    area && {
      key: 'area',
      icon: 'business-outline',
      title: `Área: ${area.area}`,
      reason: area.matches > 1
        ? `${area.matches} tareas parecidas se asignaron a esta área.`
        : 'Una tarea parecida se asignó a esta área.',
      onApply: onApplyArea && (() => onApplyArea(area.area)),
    },
  ].filter(Boolean);

  const count = rows.length + (similarTasks.length > 0 ? 1 : 0);
  if (count === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((value) => !value)}
        activeOpacity={ACTIVE_OPACITY}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={`Sugerencias, ${count}`}
      >
        <Ionicons name="sparkles" size={18} color={theme.primary} />
        <View style={styles.headerText}>
          <Text style={[styles.heading, { color: theme.text }]}>Sugerencias</Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>
            Según el título y las tareas anteriores
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primaryAlpha }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{count}</Text>
        </View>
        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      {!collapsed && rows.map((row) => (
        <View key={row.key} style={[styles.row, { borderTopColor: theme.borderLight }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryAlpha }]}>
            <Ionicons name={row.icon} size={18} color={theme.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: theme.text }]}>{row.title}</Text>
            {!!row.reason && <Text style={[styles.reason, { color: theme.textSecondary }]}>{row.reason}</Text>}
          </View>
          {!isReadOnly && row.onApply && (
            <TouchableOpacity
              onPress={row.onApply}
              style={[styles.apply, { borderColor: theme.primary }]}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={`Aplicar: ${row.title}`}
            >
              <Text style={[styles.applyText, { color: theme.primary }]}>Aplicar</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {!collapsed && similarTasks.length > 0 && (
        <View style={[styles.similar, { borderTopColor: theme.borderLight }]}>
          <View style={styles.similarHeader}>
            <Ionicons name="copy-outline" size={18} color={theme.warningText} />
            <Text style={[styles.title, { color: theme.text }]}>
              {similarTasks.length === 1 ? 'Ya existe una tarea parecida' : 'Ya existen tareas parecidas'}
            </Text>
          </View>
          <Text style={[styles.reason, { color: theme.textSecondary }]}>
            Revísalas antes de crear una duplicada.
          </Text>
          {similarTasks.map(({ task, score }) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.similarItem, { backgroundColor: theme.background }]}
              onPress={onOpenTask ? () => onOpenTask(task) : undefined}
              disabled={!onOpenTask}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={`Abrir tarea parecida: ${task.title}`}
            >
              <View style={styles.rowText}>
                <Text style={[styles.similarTitle, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
                <Text style={[styles.reason, { color: theme.textTertiary }]} numberOfLines={1}>
                  {[task.area, statusLabel(task.status), `${Math.round(score * 100)}% parecida`].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  subheading: {
    ...TYPOGRAPHY.caption,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  reason: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  apply: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    justifyContent: 'center',
  },
  applyText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  similar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  similarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  similarTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
});
