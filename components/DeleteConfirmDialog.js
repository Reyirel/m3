// components/DeleteConfirmDialog.js
// Diálogo mejorado para confirmación de eliminación con detalles y opciones

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from './ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';

export default function DeleteConfirmDialog({ 
  visible = false, 
  title = 'Eliminar tarea?',
  taskTitle = '',
  taskDetails = {},
  onConfirm = null, 
  onCancel = null,
  isLoading = false 
}) {
  const { theme } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [requireConfirmText, setRequireConfirmText] = useState(false);

  const handleConfirm = () => {
    if (requireConfirmText && confirmText.toLowerCase() !== 'eliminar') {
      Alert.alert('Error', 'Debes escribir "ELIMINAR" para confirmar');
      return;
    }
    onConfirm?.();
    setConfirmText('');
  };

  const handleCancel = () => {
    onCancel?.();
    setConfirmText('');
    setRequireConfirmText(false);
  };

  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={
        <View style={styles.messageContainer}>
          {taskTitle && (
            <View style={[styles.taskPreview, { borderColor: theme.error }]}>
              <Ionicons name="alert-circle" size={20} color={theme.error} />
              <Text style={[styles.taskTitle, { color: theme.text }]}>
                {taskTitle}
              </Text>
            </View>
          )}
          
          <Text style={[styles.warningText, { color: theme.text }]}>
            Esta acción es irreversible. La tarea será eliminada permanentemente de la base de datos.
          </Text>

          {taskDetails.status && (
            <View style={[styles.detailsBox, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Estado:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{taskDetails.status}</Text>
              </View>
              {taskDetails.priority && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Prioridad:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{taskDetails.priority}</Text>
                </View>
              )}
              {taskDetails.assignedTo && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Asignado a:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{taskDetails.assignedTo}</Text>
                </View>
              )}
            </View>
          )}

          <View style={[styles.confirmTextBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.requireText, { color: theme.error }]}>
              🔒 Escribe ELIMINAR para confirmar:
            </Text>
          </View>
        </View>
      }
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={isLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
      cancelText="Cancelar"
      danger={true}
      isLoading={isLoading}
    />
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    gap: 12,
  },
  taskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  detailsBox: {
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
  },
  confirmTextBox: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  requireText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
