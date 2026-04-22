// components/OverdueAlert.js
// Panel de alerta para tareas vencidas y urgentes — versión informativa
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';

const PRIORITY_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' };

function formatTimeOverdue(diffHours) {
  const abs = Math.abs(diffHours);
  if (abs < 1) return 'hace menos de 1h';
  if (abs < 24) return `hace ${Math.floor(abs)}h`;
  const days = Math.floor(abs / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

function formatTimeLeft(diffHours) {
  if (diffHours < 1) {
    const mins = Math.round(diffHours * 60);
    return `${mins}m restantes`;
  }
  const h = Math.floor(diffHours);
  const m = Math.round((diffHours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h restantes`;
}

export default function OverdueAlert({ tasks, currentUserEmail, role = 'director', onTaskPress }) {
  const { theme, isDark } = useTheme();
  const getPriorityColor = (priority) => ({ alta: theme.error, media: theme.warning, baja: theme.textMuted }[priority] || theme.textMuted);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'urgent'
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const { overdue, urgent } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { overdue: [], urgent: [] };
    const now = Date.now();
    const overdue = [];
    const urgent = [];

    const applicable = tasks.filter(t => {
      if (t.status === 'cerrada') return false;
      if (role === 'admin' || role === 'secretario' || role === 'director') return true;
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return assignees.some(a => (typeof a === 'string' ? a : a?.email || '').toLowerCase() === currentUserEmail?.toLowerCase());
    });

    applicable.forEach(task => {
      const diff = (toMs(task.dueAt) - now) / (1000 * 60 * 60);
      if (diff < 0) overdue.push({ ...task, _diffHours: diff });
      else if (diff < 6) urgent.push({ ...task, _diffHours: diff });
    });

    // Sort overdue: most overdue first; urgent: least time first
    overdue.sort((a, b) => a._diffHours - b._diffHours);
    urgent.sort((a, b) => a._diffHours - b._diffHours);

    return { overdue, urgent };
  }, [tasks, currentUserEmail, role]);

  const total = overdue.length + urgent.length;

  // Animate banner in — only when mounted (total > 0)
  useEffect(() => {
    if (total > 0) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [total, slideAnim, opacityAnim]);

  if (total === 0) return null;

  const hasOverdue = overdue.length > 0;
  const hasUrgent = urgent.length > 0;
  const displayList = activeTab === 'overdue' ? overdue : urgent;

  return (
    <>
      {/* ── Banner compacto ─────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? theme.glass : theme.errorAlpha,
            borderColor: hasOverdue ? theme.error : theme.warning,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.bannerLeft}>
          <Ionicons
            name={hasOverdue ? 'alert-circle' : 'time'}
            size={18}
            color={hasOverdue ? theme.error : theme.warning}
          />
          {hasOverdue ? (
            <Text style={[styles.bannerText, { color: theme.text }]}>
              <Text style={{ color: theme.error, fontWeight: '700' }}>{overdue.length} vencida{overdue.length !== 1 ? 's' : ''}</Text>
              {hasUrgent ? <Text style={{ color: theme.textSecondary }}> · </Text> : null}
              {hasUrgent ? <Text style={{ color: theme.warning, fontWeight: '700' }}>{urgent.length} urgente{urgent.length !== 1 ? 's' : ''}</Text> : null}
            </Text>
          ) : (
            <Text style={[styles.bannerText, { color: theme.warning, fontWeight: '700' }]}>{urgent.length} tarea{urgent.length !== 1 ? 's' : ''} urgente{urgent.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.bannerBtn, { backgroundColor: hasOverdue ? theme.error : theme.warning }, Platform.OS === 'web' && { cursor: 'pointer' }]}
          onPress={() => {
            setActiveTab(hasOverdue ? 'overdue' : 'urgent');
            setModalVisible(true);
          }}
        >
          <Text style={styles.bannerBtnText}>Ver</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Modal de detalle ────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, {
            backgroundColor: isDark ? 'rgba(15,10,25,0.96)' : 'rgba(255,255,255,0.97)',
            borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
            borderWidth: 1,
            borderBottomWidth: 0,
          }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="notifications-circle" size={26} color={theme.error} style={{ marginRight: 10 }} />
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Alertas de Tareas</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {total} tarea{total !== 1 ? 's' : ''} requieren atención
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
              {hasOverdue && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'overdue' && { backgroundColor: theme.error }]}
                  onPress={() => setActiveTab('overdue')}
                >
                  <Ionicons name="alert-circle" size={15} color={activeTab === 'overdue' ? '#FFF' : theme.error} />
                  <Text style={[styles.tabText, { color: activeTab === 'overdue' ? '#FFF' : theme.error }]}>
                    Vencidas ({overdue.length})
                  </Text>
                </TouchableOpacity>
              )}
              {hasUrgent && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'urgent' && { backgroundColor: theme.warning }]}
                  onPress={() => setActiveTab('urgent')}
                >
                  <Ionicons name="timer" size={15} color={activeTab === 'urgent' ? '#FFF' : theme.warning} />
                  <Text style={[styles.tabText, { color: activeTab === 'urgent' ? '#FFF' : theme.warning }]}>
                    Urgentes ({urgent.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Task list */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {displayList.map((task) => {
                const isOverdueTask = activeTab === 'overdue';
                const accentColor = isOverdueTask ? theme.error : theme.warning;
                const timeLabel = isOverdueTask
                  ? formatTimeOverdue(task._diffHours)
                  : formatTimeLeft(task._diffHours);
                const priority = task.priority || 'media';
                const assignees = Array.isArray(task.assignedTo)
                  ? task.assignedTo.map(a => typeof a === 'string' ? a : a?.name || a?.email || '').join(', ')
                  : (task.assignedTo || '');

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, { backgroundColor: isDark ? theme.glass : theme.glassStrong, borderLeftColor: accentColor }]}
                    onPress={() => {
                      setModalVisible(false);
                      onTaskPress?.(task);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.taskCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        {task.area ? (
                          <Text style={[styles.taskMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                            {task.area}
                          </Text>
                        ) : null}
                        {assignees ? (
                          <Text style={[styles.taskMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                            {assignees}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.taskRight}>
                        <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(priority)}20` }]}>
                          <Text style={[styles.priorityText, { color: getPriorityColor(priority) }]}>
                            {PRIORITY_LABEL[priority] || priority}
                          </Text>
                        </View>
                        <View style={[styles.timeBadge, { backgroundColor: `${accentColor}15` }]}>
                          <Ionicons name={isOverdueTask ? 'alert-circle-outline' : 'hourglass-outline'} size={12} color={accentColor} />
                          <Text style={[styles.timeText, { color: accentColor }]}>{timeLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: theme.primary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.footerBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    fontSize: 13,
    flexShrink: 1,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  bannerBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 20 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    maxHeight: 320,
  },
  taskCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 19,
  },
  taskMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  taskRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  footerBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  footerBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
