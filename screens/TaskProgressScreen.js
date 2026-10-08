// screens/TaskProgressScreen.js
// Pantalla detallada de progreso de una tarea con múltiples asignados
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToTaskProgress } from '../services/taskProgress';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import ProgressBar from '../components/ProgressBar';
import ShimmerEffect from '../components/ShimmerEffect';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { toMs } from '../utils/dateUtils';
import ScreenHeader from '../components/ui/ScreenHeader';
import { DURATION, timing } from '../theme/motion';
import { styles } from './task/TaskProgressScreenStyles';

Dimensions.get('window');

export default function TaskProgressScreen({ route, navigation }) {
  const { taskId, task } = route.params;
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { currentUser } = useTasks();

  const [expandedSubtask, setExpandedSubtask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Suscribir a cambios de progreso en tiempo real
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTaskProgress(taskId, (data) => {
      setProgressData(data);
      setLoading(false);
      setRefreshing(false);

      // Animar entrada
      Animated.parallel([
        timing(fadeAnim, 1, { duration: DURATION.slow }),
        timing(slideAnim, 0, { duration: DURATION.slow })
      ]).start();
    });

    return () => unsubscribe();
  }, [taskId, fadeAnim, slideAnim]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleEdit = () => {
    if (!currentUser || (currentUser.role !== 'admin')) {
      Alert.alert('Sin permisos', 'Solo administradores pueden editar tareas');
      return;
    }
    navigation.navigate('TaskDetail', { task, taskId });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header bar shimmer */}
        <ShimmerEffect width="100%" height={56} borderRadius={0} />
        <View style={{ flex: 1, padding: 16 }}>
          {/* Title + progress bar card */}
          <ShimmerEffect width="100%" height={130} borderRadius={14} style={{ marginBottom: 16 }} />
          {/* Stat mini cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[1,2,3,4].map(i => <ShimmerEffect key={i} width="22%" height={64} borderRadius={10} />)}
          </View>
          {/* Assignee rows */}
          {[1,2,3].map(i => (
            <ShimmerEffect key={i} width="100%" height={88} borderRadius={14} style={{ marginBottom: 12 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!progressData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            No se encontró la tarea
          </Text>
        </View>
      </View>
    );
  }

  const { overallProgress, progressByAssignee, subtaskStats, isComplete } = progressData;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Header */}
      <ScreenHeader
        title="Avance de la tarea"
        subtitle={progressData?.titulo}
        onBack={() => navigation.goBack()}
        actions={[
          { icon: 'refresh', label: 'Actualizar', onPress: onRefresh },
          currentUser?.role === 'admin' && { icon: 'pencil', label: 'Editar tarea', onPress: handleEdit },
          {
            icon: 'document-text',
            label: 'Ver reportes',
            onPress: () => navigation.navigate('TaskReportsAndActivity', { taskId, taskTitle: progressData?.titulo }),
          },
        ].filter(Boolean)}
      />

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* CARD PROGRESO GENERAL */}
        <View style={[styles.card, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Progreso General</Text>
            {isComplete && (
              <View style={[styles.completionBadge, { backgroundColor: theme.successAlpha }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                <Text style={[styles.completionBadgeText, { color: theme.success }]}>Completada</Text>
              </View>
            )}
          </View>

          <View style={styles.spacer} />

          <ProgressBar
            progress={overallProgress}
            size="large"
            label="Avance Total"
            color={theme.primary}
          />

          <View style={[styles.statsGrid, { marginTop: 20 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.success }]}>
                {subtaskStats.completada}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Completadas
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.warning }]}>
                {subtaskStats.en_proceso}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                En Proceso
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.error }]}>
                {subtaskStats.pendiente}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Pendientes
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>
                {subtaskStats.total}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total
              </Text>
            </View>
          </View>
        </View>

        {/* CARD PROGRESO POR ASIGNADO */}
        <View style={[styles.card, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 16 }]}>
            Progreso por Asignado
          </Text>

          {Object.entries(progressByAssignee).length > 0 ? (
            Object.entries(progressByAssignee).map(([email, progress]) => (
              <View key={email} style={styles.assigneeProgressItem}>
                <View style={styles.assigneeHeader}>
                  <View style={[styles.assigneeAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={styles.assigneeAvatarText}>
                      {email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assigneeEmail, { color: theme.text }]}>
                      {email.split('@')[0]}
                    </Text>
                    <Text style={[styles.assigneeSubtext, { color: theme.textSecondary }]}>
                      {progress.completed} de {progress.total} tareas
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          progress.status === 'completada'
                            ? theme.successAlpha
                            : progress.status === 'en-progreso'
                            ? theme.warningAlpha
                            : theme.errorAlpha
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            progress.status === 'completada'
                              ? theme.success
                              : progress.status === 'en-progreso'
                              ? theme.warning
                              : theme.error
                        }
                      ]}
                    >
                      {progress.percentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.assigneeProgressBar}>
                  <ProgressBar
                    progress={progress.percentage}
                    size="small"
                    showLabel={false}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyAssignees}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Sin asignados
              </Text>
            </View>
          )}
        </View>

        {/* CARD SUBTAREAS */}
        {progressData.subtasks && progressData.subtasks.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="checklist" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 8, flex: 1 }]}>
                Subtareas ({progressData.subtasks.length})
              </Text>
              <View style={[styles.progressBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.progressBadgeText}>
                  {progressData.subtaskStats.completada}/{progressData.subtaskStats.total}
                </Text>
              </View>
            </View>

            <ProgressBar
              progress={progressData.overallProgress}
              size="small"
              showLabel={true}
              color={progressData.isComplete ? theme.success : theme.primary}
            />

            <View style={styles.subtasksList}>
              {progressData.subtasks.map((subtask, _index) => {
                const isExpanded = expandedSubtask === subtask.id;
                const isCompleted = subtask.status === 'completada';
                
                return (
                  <TouchableOpacity
                    key={subtask.id}
                    onPress={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
                    style={[
                      styles.subtaskItem,
                      {
                        borderColor: isCompleted ? theme.success : theme.border,
                        backgroundColor: isCompleted ? theme.successAlpha : (isDark ? theme.glass : theme.glassStrong),
                        paddingBottom: isExpanded ? 16 : 12,
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Header */}
                    <View style={styles.subtaskHeader}>
                      <View style={styles.subtaskStatus}>
                        {isCompleted ? (
                          <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                        ) : (
                          <Ionicons name="radio-button-off" size={24} color={theme.textSecondary} />
                        )}
                      </View>

                      <View style={styles.subtaskMainContent}>
                        <Text
                          style={[
                            styles.subtaskTitle,
                            {
                              color: theme.text,
                              textDecorationLine: isCompleted ? 'line-through' : 'none',
                              opacity: isCompleted ? 0.6 : 1,
                            }
                          ]}
                        >
                          {subtask.title}
                        </Text>
                        <Text style={[styles.subtaskMeta, { color: theme.textSecondary }]}>
                          {subtask.assignedTo ? subtask.assignedTo.split('@')[0] : 'Sin asignar'} • {subtask.status.replace('_', ' ')}
                        </Text>
                      </View>

                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </View>

                    {/* Detalles Expandibles */}
                    {isExpanded && (
                      <View style={[styles.subtaskDetails, { borderTopColor: theme.border }]}>
                        {subtask.description && (
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {subtask.description}
                          </Text>
                        )}
                        {subtask.createdAt && (
                          <Text style={[styles.subtaskTimestamp, { color: theme.textTertiary }]}>
                            Creada: {new Date(toMs(subtask.createdAt)).toLocaleDateString()}
                          </Text>
                        )}
                        {isCompleted && subtask.completedAt && (
                          <Text style={[styles.subtaskTimestamp, { color: theme.success }]}>
                            ✓ Completada: {new Date(toMs(subtask.completedAt)).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* TIMELINE DE ACTIVIDADES */}
        {progressData.lastActivity && (
          <View style={[styles.card, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 8 }]}>
                Última Actividad
              </Text>
            </View>

            <View style={[styles.activityItem, { borderLeftColor: theme.primary }]}>
              <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>
                  {progressData.lastActivity.title}
                </Text>
                <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
                  {progressData.lastActivity.updatedAt
                    ? new Date(
                        toMs(progressData.lastActivity.updatedAt)
                      ).toLocaleString('es-ES')
                    : 'Hace poco'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}
