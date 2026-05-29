// components/AreaCoordinationProgress.js
// Muestra el progreso de una tarea asignada a múltiples áreas
// Cada área tiene su subtarea y se visualiza su estado

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToAreaSubtasks } from '../services/areaSubtasks';
import { useTheme } from '../contexts/ThemeContext';

const statusConfig = {
  'pendiente': { icon: 'time-outline', color: '#FF9500', label: 'Pendiente' },
  'en_proceso': { icon: 'sync-outline', color: '#007AFF', label: 'En Proceso' },
  'en_revision': { icon: 'eye-outline', color: '#5856D6', label: 'En Revisión' },
  'completada': { icon: 'checkmark-circle', color: '#34C759', label: 'Completada' },
  'bloqueada': { icon: 'close-circle', color: '#FF3B30', label: 'Bloqueada' }
};

export default function AreaCoordinationProgress({ parentTaskId, onSubtaskPress, currentUserArea }) {
  const { theme, isDark } = useTheme();
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!parentTaskId) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = subscribeToAreaSubtasks(parentTaskId, (tasks) => {
      // Ordenar: primero la del área actual del usuario, luego el resto
      const sorted = [...tasks].sort((a, b) => {
        if (a.area === currentUserArea) return -1;
        if (b.area === currentUserArea) return 1;
        return a.area.localeCompare(b.area);
      });
      setSubtasks(sorted);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [parentTaskId, currentUserArea]);
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (subtasks.length === 0) {
    return null;
  }

  const completedCount = subtasks.filter(st =>
    st.status === 'completada' || st.status === 'en_revision'
  ).length;
  const progress = Math.round((completedCount / subtasks.length) * 100);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      {/* Header con progreso general */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="git-branch-outline" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Coordinación entre Áreas</Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: progress === 100 ? '#34C759' : theme.primary }]}>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
      
      {/* Barra de progreso */}
      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#34C759' : theme.primary 
            }
          ]} 
        />
      </View>
      
      {/* Lista de áreas */}
      <View style={styles.areasList}>
        {subtasks.map((subtask) => {
          const config = statusConfig[subtask.status] || statusConfig.pendiente;
          const subtaskAreaLower = (subtask.area || '').toLowerCase().trim();
          const currentAreaLower = (currentUserArea || '').toLowerCase().trim();
          const isCurrentArea = subtaskAreaLower === currentAreaLower;
          
          return (
            <TouchableOpacity 
              key={subtask.id}
              style={[
                styles.areaItem, 
                { 
                  backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
                  borderWidth: 1,
                  borderLeftColor: config.color,
                  borderColor: isCurrentArea ? theme.primary : (isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)')
                }
              ]}
              onPress={() => onSubtaskPress && onSubtaskPress(subtask)}
            >
              <View style={styles.areaHeader}>
                <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>
                  {subtask.area}
                </Text>
                {isCurrentArea && (
                  <View style={[styles.yourAreaBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.yourAreaText}>Tu área</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.areaStatus}>
                <Ionicons name={config.icon} size={16} color={config.color} />
                <Text style={[styles.statusLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              
              {subtask.assignedToNames && subtask.assignedToNames.length > 0 && (
                <Text style={[styles.assignees, { color: theme.textSecondary }]} numberOfLines={1}>
                  👤 {subtask.assignedToNames.join(', ')}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Mensaje informativo */}
      <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.15)' }]}>
        <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Cada área debe completar su parte. La tarea general se completará cuando todas las áreas terminen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  areasList: {
    gap: 10,
  },
  areaItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 2,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  yourAreaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  yourAreaText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  areaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  assignees: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
