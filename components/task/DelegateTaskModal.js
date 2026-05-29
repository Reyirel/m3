// components/task/DelegateTaskModal.js
// Modal para delegar una tarea a un director.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canAssignAreaSubtask } from '../../services/permissions';
import { useNotification } from '../../contexts/NotificationContext';
import GlassmorphicButton from '../glass/GlassmorphicButton';

/**
 * Props:
 *  visible        — boolean
 *  onClose        — () => void
 *  task           — objeto de la tarea (editingTask)
 *  delegateUsers  — array de directores disponibles
 *  currentUser    — objeto del usuario actual
 *  theme          — objeto de tema
 *  onDelegate     — async (director) => void  (callback principal al delegar)
 */
export default function DelegateTaskModal({
  visible,
  onClose,
  task,
  delegateUsers,
  currentUser,
  theme,
  onDelegate,
}) {
  const styles = createStyles(theme);
  const { showError, showWarning } = useNotification();

  const handleSelect = (director) => {
    if (!task || !director) return;

    // Verificar permisos para subtareas de área
    if (task.isAreaSubtask && currentUser) {
      const permission = canAssignAreaSubtask(currentUser, task);
      if (!permission.canAssign) {
        showError(permission.reason);
        return;
      }

      if (currentUser.role === 'secretario' && !permission.multiAssignAllowed) {
        const currentAssignees = task.assignedTo || [];
        if (currentAssignees.length > 0) {
          showWarning('Las subtareas solo pueden asignarse a UN director. Para cambiar el asignado actual, elimina primero la asignación anterior.');
          return;
        }
      }
    }

    onDelegate(director);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Delegar Tarea</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Selecciona un director para asignarle esta tarea:
          </Text>

          {task?.isAreaSubtask && currentUser?.role === 'secretario' && (
            <View style={[styles.warningBox, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.warningText}>
                Las subtareas solo pueden asignarse a UN director. Cada subtarea debe ser responsabilidad de una sola persona.
              </Text>
            </View>
          )}

          <ScrollView style={styles.list}>
            {delegateUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No hay directores disponibles en tus áreas
                </Text>
              </View>
            ) : (
              delegateUsers.map((director) => (
                <TouchableOpacity
                  key={director.email}
                  style={[styles.userItem, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => handleSelect(director)}
                >
                  <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Ionicons name="person" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>{director.displayName}</Text>
                    <Text style={[styles.userArea, { color: theme.textSecondary }]}>{director.area}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <GlassmorphicButton
            title="Cancelar"
            onPress={onClose}
            variant="outline"
            size="large"
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (_theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
    },
    subtitle: {
      fontSize: 14,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
    },
    warningText: {
      fontSize: 12,
      color: '#333',
      flex: 1,
      fontWeight: '500',
    },
    list: {
      paddingHorizontal: 20,
      maxHeight: 400,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 15,
      textAlign: 'center',
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
      marginLeft: 14,
    },
    userName: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    userArea: {
      fontSize: 13,
    },
    cancelButton: {
      marginHorizontal: 20,
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
