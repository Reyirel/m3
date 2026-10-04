// screens/kanban/KanbanSheets.js
// Paneles inferiores del tablero: edición rápida de una tarea y estadísticas.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../components/BottomSheet';

const PRIORITY_LABELS = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

/** Cambiar prioridad o estado de una tarea sin abrirla (se abre con un toque largo) */
export function QuickEditSheet({ task, statuses, canClose, onChangePriority, onChangeStatus, onClose, styles, theme, isDark }) {
  if (!task) return null;
  return (
    <BottomSheet visible onClose={onClose} height={300} title="Edición Rápida">
      <View style={styles.contextMenuContent}>
        <Text style={[styles.contextTaskTitle, { color: theme.text }]}>{task.title}</Text>

        <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Cambiar prioridad:</Text>
        <View style={styles.priorityOptions}>
          {Object.keys(PRIORITY_LABELS).map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.priorityOption,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' },
                task.priority === priority && { backgroundColor: theme.primaryAlpha },
              ]}
              onPress={() => onChangePriority(task.id, priority)}
            >
              <Text style={[styles.priorityOptionText, { color: theme.text }]}>{PRIORITY_LABELS[priority]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.contextLabel, { color: theme.textSecondary, marginTop: 16 }]}>Cambiar estado:</Text>
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
    <BottomSheet visible={visible} onClose={onClose} height={340} title="Estadísticas del Tablero">
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
