/**
 * TaskHeader.js
 * 
 * Header del TaskDetailScreen
 * Contiene: Close button, Delete button, Pomodoro button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function TaskHeader({
  isEditing = false,
  canDelete = false,
  onClose = () => {},
  onDelete = () => {},
  onShowPomodoro = () => {},
}) {
  const { theme, isDark } = useTheme();

  return (
    <LinearGradient
      colors={theme.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerBar, { shadowColor: theme.primary }]}
    >
      {/* CLOSE BUTTON */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        accessible={true}
        accessibilityLabel="Cerrar"
        accessibilityHint="Presiona para volver atrás"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* TITLE */}
      <View style={styles.headerTitleContainer}>
        <Ionicons
          name={isEditing ? 'pencil' : 'sparkles'}
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
        </Text>
      </View>

      {/* POMODORO & DELETE BUTTONS */}
      <View style={styles.rightButtons}>
        {isEditing && (
          <TouchableOpacity
            onPress={onShowPomodoro}
            style={styles.pomodoroButton}
            accessible={true}
            accessibilityLabel="Pomodoro Timer"
            accessibilityHint="Presiona para abrir el temporizador Pomodoro"
            accessibilityRole="button"
          >
            <Ionicons name="timer" size={24} color={theme.primary} />
          </TouchableOpacity>
        )}

        {canDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible={true}
            accessibilityLabel="Eliminar tarea"
            accessibilityHint="Presiona para eliminar esta tarea"
            accessibilityRole="button"
          >
            <Ionicons name="trash" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {!isEditing && <View style={{ width: 40 }} />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 20,
    gap: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pomodoroButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,59,48,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
