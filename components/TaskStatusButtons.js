// components/TaskStatusButtons.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { getCurrentSession } from '../services/authFirestore';
import { canReopenTask } from '../services/permissions';

const statusFlow = {
  'pendiente':   { next: 'en_proceso',   label: 'Iniciar',   icon: 'play-circle-outline',     color: '#007AFF' },
  'en_proceso':  { next: 'en_revision',  label: 'A revisión', icon: 'eye-outline',             color: '#AF52DE' },
  'en_revision': { next: 'cerrada',      label: 'Completar', icon: 'checkmark-circle-outline', color: '#34C759' },
  'cerrada':     { next: 'pendiente',    label: 'Reabrir',   icon: 'refresh-outline',          color: '#FF9500' },
};

export default function TaskStatusButtons({ currentStatus, taskId, onStatusChange, task = {} }) {
  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const nextState = statusFlow[currentStatus || 'pendiente'];

  useEffect(() => {
    getCurrentSession().then(r => { if (r.success) setCurrentUser(r.session); });
  }, []);

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
        Alert.alert('Sin permisos', permission.reason);
        return;
      }
    }
    onStatusChange(taskId, nextState.next);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.75}
        style={[styles.chip, { borderColor: nextState.color + '50', backgroundColor: nextState.color + '14' }]}
      >
        <Ionicons name={nextState.icon} size={14} color={nextState.color} />
        <Text style={[styles.label, { color: nextState.color }]}>{nextState.label}</Text>
        <Ionicons name="chevron-forward" size={12} color={nextState.color + 'AA'} />
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
    borderRadius: 20,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
