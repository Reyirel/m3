/**
 * TaskHeader.js
 *
 * Encabezado del formulario de tarea: cerrar, título y eliminar.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { ACTIVE_OPACITY } from '../../theme/motion';

const BUTTON_SIZE = 40;

export default function TaskHeader({
  isEditing = false,
  canDelete = false,
  onClose = () => {},
  onDelete = () => {},
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={theme.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[
        styles.headerBar,
        { paddingTop: insets.top + (Platform.OS === 'web' ? SPACING.lg : SPACING.md), borderBottomColor: theme.glassBorder },
      ]}
    >
      <TouchableOpacity
        onPress={onClose}
        style={styles.button}
        activeOpacity={ACTIVE_OPACITY}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityLabel="Cerrar"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {isEditing ? 'Editar tarea' : 'Nueva tarea'}
      </Text>

      {canDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.button}
          activeOpacity={ACTIVE_OPACITY}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityLabel="Eliminar tarea"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        // Mantiene el título centrado cuando no hay botón a la derecha
        <View style={{ width: BUTTON_SIZE }} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
