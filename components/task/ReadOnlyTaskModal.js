// components/task/ReadOnlyTaskModal.js
// Modal de solo lectura para directores y secretarios.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskStatusButtons from '../TaskStatusButtons';
import SubtasksList from '../SubtasksList';
import AreaCoordinationProgress from '../AreaCoordinationProgress';
import GlassmorphicButton from '../glass/GlassmorphicButton';

/**
 * Props:
 *  task             — objeto de la tarea (editingTask)
 *  navigation       — objeto de navegación de React Navigation
 *  theme            — objeto de tema de ThemeContext
 *  canAddSubtask    — boolean
 *  canDelegate      — boolean
 *  delegateUsers    — array
 *  currentUser      — objeto del usuario actual
 *  onStatusChange   — (taskId, newStatus) => void
 *  onOpenDelegate   — () => void  (abre el modal de delegación)
 */
export default function ReadOnlyTaskModal({
  task,
  navigation,
  theme,
  canAddSubtask,
  canDelegate,
  delegateUsers,
  currentUser,
  onStatusChange,
  onOpenDelegate,
}) {
  if (!task) return null;

  const styles = createStyles(theme);

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={() => navigation.goBack()}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Detalles de la Tarea</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Nombre */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Nombre de la Tarea</Text>
              <View style={[styles.field, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.fieldText, { color: theme.text }]}>{task.title}</Text>
              </View>
            </View>

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Lo que debes hacer</Text>
              <View style={[styles.fieldLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.fieldText, { color: theme.text }]}>
                  {task.description || 'Sin descripción'}
                </Text>
              </View>
            </View>

            {/* Cambiar estado */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Cambiar Estado</Text>
              <TaskStatusButtons
                currentStatus={task.status || 'pendiente'}
                taskId={task.id}
                onStatusChange={onStatusChange}
                task={task}
              />
            </View>

            {/* Subtareas */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Subtareas</Text>
              <SubtasksList
                taskId={task.id}
                canEdit={canAddSubtask}
                canDelegate={canDelegate}
                delegateUsers={delegateUsers}
                currentUser={currentUser}
              />
            </View>

            {/* Coordinación entre áreas */}
            {task?.isCoordinationTask && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Progreso por Área</Text>
                <AreaCoordinationProgress
                  parentTaskId={task.id}
                  currentUserArea={currentUser?.area}
                  onSubtaskPress={(subtask) => {
                    navigation.navigate('TaskDetail', { task: subtask });
                  }}
                />
              </View>
            )}

            {/* Más opciones */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Más Opciones</Text>
              <View style={{ gap: 12, marginTop: 10 }}>
                {/* Reportes */}
                <GlassmorphicButton
                  title="Ver/Enviar Reportes"
                  onPress={() => {
                    navigation.goBack();
                    setTimeout(() => {
                      navigation.navigate('TaskReportsAndActivity', {
                        taskId: task.id,
                        taskTitle: task.title,
                      });
                    }, 300);
                  }}
                  variant="primary"
                  size="large"
                  icon="document-text"
                />

                {/* Chat */}
                <GlassmorphicButton
                  title="Ir al Chat"
                  onPress={() => {
                    navigation.goBack();
                    setTimeout(() => {
                      navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
                    }, 300);
                  }}
                  variant="secondary"
                  size="large"
                  icon="chatbubble-ellipses"
                />

                {/* Delegar — solo secretarios con permiso */}
                {canDelegate && currentUser?.role === 'secretario' && (
                  <GlassmorphicButton
                    title="Delegar Tarea"
                    onPress={onOpenDelegate}
                    variant="outline"
                    size="large"
                    icon="people"
                  />
                )}
              </View>
            </View>
          </ScrollView>

          {/* Cerrar */}
          <TouchableOpacity
            style={[styles.closeButtonBottom, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonBottomText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (_theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    container: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 50,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    field: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      minHeight: 50,
      justifyContent: 'center',
    },
    fieldLarge: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      minHeight: 120,
      justifyContent: 'flex-start',
    },
    fieldText: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
    },
    actionButton: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    closeButtonBottom: {
      marginHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    closeButtonBottomText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
