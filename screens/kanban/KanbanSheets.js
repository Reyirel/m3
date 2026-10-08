// screens/kanban/KanbanSheets.js
// Paneles inferiores del tablero: edición rápida de una tarea y estadísticas.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../components/BottomSheet';
import { priorityColor, priorityLabel } from '../../utils/taskStatus';
import { ACTIVE_OPACITY } from '../../theme/motion';

const PRIORITIES = ['alta', 'media', 'baja'];

/** Cambiar prioridad o estado de una tarea sin abrirla (se abre con un toque largo) */
export function QuickEditSheet({ task, statuses, canClose, canEditPriority, onChangePriority, onChangeStatus, onClose, styles, theme }) {
  if (!task) return null;
  return (
    <BottomSheet visible onClose={onClose} height={360} title="Edición rápida">
      <View style={styles.contextMenuContent}>
        <Text style={[styles.contextTaskTitle, { color: theme.text }]}>{task.title}</Text>

        {canEditPriority && (
          <>
            <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Cambiar prioridad:</Text>
            <View style={styles.priorityOptions}>
              {PRIORITIES.map((priority) => {
                const selected = task.priority === priority;
                const color = priorityColor(priority, theme);
                return (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                      { backgroundColor: selected ? theme.primaryAlpha : theme.surfaceL2 },
                    ]}
                    onPress={() => onChangePriority(task.id, priority)}
                    activeOpacity={ACTIVE_OPACITY}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Prioridad ${priorityLabel(priority)}`}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={[styles.priorityOptionText, { color: theme.text }]}>{priorityLabel(priority)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.contextLabel, { color: theme.textSecondary, marginTop: canEditPriority ? 16 : 0 }]}>Cambiar estado:</Text>
        <View style={styles.statusOptions}>
          {statuses.filter((status) => status.key !== 'cerrada' || canClose).map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.statusOption,
                { backgroundColor: status.color + '20' },
                task.status === status.key && { borderWidth: 2, borderColor: status.color },
              ]}
              onPress={() => onChangeStatus(task.id, status.key)}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="radio"
              accessibilityState={{ selected: task.status === status.key }}
              accessibilityLabel={`Estado ${status.label}`}
            >
              <Ionicons name={status.icon} size={20} color={status.color} />
              <Text style={[styles.statusOptionText, { color: status.color }]}>{status.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

/** Cuántas tareas hay en cada estado y qué parte del total representan */
export function StatsSheet({ visible, onClose, statuses, tasksByStatus, total, styles, theme, isDark }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} height={380} title="Estadísticas del tablero">
      <View style={styles.statsGrid}>
        {statuses.map((status) => {
          const count = tasksByStatus[status.key]?.byStatus.length || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <View
              key={status.key}
              style={[
                styles.statCard,
                { backgroundColor: isDark ? theme.surfaceL2 : theme.glassStrong, borderColor: status.color + '40' },
              ]}
            >
              <View style={[styles.statColorBar, { backgroundColor: status.color }]} />
              <View style={styles.statCardInner}>
                <Text style={[styles.statCardCount, { color: status.color }]}>{count}</Text>
                <Text style={[styles.statCardLabel, { color: theme.text }]}>{status.label}</Text>
                <View style={[styles.statBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                  <View style={[styles.statBarFill, { width: `${pct}%`, backgroundColor: status.color }]} />
                </View>
                <Text style={[styles.statCardPct, { color: theme.textSecondary }]}>{pct.toFixed(0)}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
