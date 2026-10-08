// components/TaskStatusButtons.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { canReopenTask } from '../services/permissions';
import { statusColor } from '../utils/taskStatus';
import { infoAlert } from '../utils/alert';
import { ACTIVE_OPACITY } from '../theme/motion';

const statusFlow = {
  'pendiente':   { next: 'en_proceso',   label: 'Iniciar',   icon: 'play-circle-outline' },
  'en_proceso':  { next: 'en_revision',  label: 'A revisión', icon: 'eye-outline' },
  'en_revision': { next: 'cerrada',      label: 'Completar', icon: 'checkmark-circle-outline' },
  'cerrada':     { next: 'pendiente',    label: 'Reabrir',   icon: 'refresh-outline' },
};

export default function TaskStatusButtons({ currentStatus, taskId, onStatusChange, task = {} }) {
  const { theme } = useTheme();
  // El usuario viene del contexto: antes cada botón leía la sesión guardada por su cuenta
  const { user: currentUser } = useAuth();
  const nextState = statusFlow[currentStatus || 'pendiente'];

  if (!nextState) return null;

  const isReopening = currentStatus === 'cerrada';
  if (isReopening && currentUser) {
    const permission = canReopenTask(currentUser, task);
    if (!permission.canReopen) return null;
  }

  const handlePress = () => {
    hapticLight();
    if (isReopening && currentUser) {
      const permission = canReopenTask(currentUser, task);
      if (!permission.canReopen) {
        infoAlert('Sin permisos', permission.reason);
        return;
      }
    }
    onStatusChange(taskId, nextState.next);
  };

  // El botón lleva el color del estado al que pasa la tarea
  const color = statusColor(nextState.next, theme);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={ACTIVE_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={nextState.label}
        style={[styles.chip, { borderColor: color + '50', backgroundColor: color + '14' }]}
      >
        <Ionicons name={nextState.icon} size={14} color={color} />
        <Text style={[styles.label, { color }]}>{nextState.label}</Text>
        <Ionicons name="chevron-forward" size={12} color={color + 'AA'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
