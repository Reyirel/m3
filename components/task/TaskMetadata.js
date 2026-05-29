/**
 * TaskMetadata.js - Metadatos: Prioridad + Estado + Fechas
 * 
 * Card con información estructurada y seleccionable
 * Accesible con VoiceOver
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../GlassCard';

const PRIORITIES = ['Baja', 'Media', 'Alta', 'Urgente'];
const STATUSES = ['Pendiente', 'En progreso', 'Revisión', 'Completada', 'Cancelada'];

export default function TaskMetadata({
  priority = 'Media',
  onPriorityChange = () => {},
  status = 'Pendiente',
  onStatusChange = () => {},
  dueDate = null,
  onDueDateChange = () => {},
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();
  const [showPriorityMenu, setShowPriorityMenu] = React.useState(false);
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const priorityColor = {
    'Baja': theme.success,
    'Media': theme.warning,
    'Alta': theme.error,
    'Urgente': '#FF1744',
  }[priority];

  const statusIcon = {
    'Pendiente': 'time-outline',
    'En progreso': 'play-circle-outline',
    'Revisión': 'checkmark-done-outline',
    'Completada': 'checkmark-circle-outline',
    'Cancelada': 'close-circle-outline',
  }[status];

  const formatDate = (date) => {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Metadatos
      </Text>

      <GlassCard style={{ gap: 12 }}>
        {/* PRIORIDAD */}
        <View>
          <Text style={[styles.label, { color: theme.text }]}>Prioridad</Text>
          <TouchableOpacity
            disabled={isReadOnly}
            onPress={() => setShowPriorityMenu(!showPriorityMenu)}
            style={[
              styles.metaButton,
              { backgroundColor: isDark ? theme.glass : theme.glassStrong },
            ]}
            accessible={true}
            accessibilityLabel={`Prioridad: ${priority}`}
            accessibilityHint="Presiona para cambiar la prioridad"
            accessibilityRole="button"
          >
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Ionicons name="flag" size={16} color="white" />
            </View>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {priority}
            </Text>
            {!isReadOnly && (
              <Ionicons
                name={showPriorityMenu ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textMuted}
              />
            )}
          </TouchableOpacity>

          {showPriorityMenu && !isReadOnly && (
            <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    onPriorityChange(p);
                    setShowPriorityMenu(false);
                  }}
                  style={[
                    styles.menuItem,
                    priority === p && { backgroundColor: theme.primary + '20' },
                  ]}
                  accessible={true}
                  accessibilityLabel={`Establecer prioridad a ${p}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: { 'Baja': theme.success, 'Media': theme.warning, 'Alta': theme.error, 'Urgente': '#FF1744' }[p] },
                    ]}
                  >
                    <Ionicons name="flag" size={14} color="white" />
                  </View>
                  <Text style={[styles.menuText, { color: theme.text }]}>{p}</Text>
                  {priority === p && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ESTADO */}
        <View>
          <Text style={[styles.label, { color: theme.text }]}>Estado</Text>
          <TouchableOpacity
            disabled={isReadOnly}
            onPress={() => setShowStatusMenu(!showStatusMenu)}
            style={[
              styles.metaButton,
              { backgroundColor: isDark ? theme.glass : theme.glassStrong },
            ]}
            accessible={true}
            accessibilityLabel={`Estado: ${status}`}
            accessibilityHint="Presiona para cambiar el estado"
            accessibilityRole="button"
          >
            <Ionicons name={statusIcon} size={18} color={theme.primary} />
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {status}
            </Text>
            {!isReadOnly && (
              <Ionicons
                name={showStatusMenu ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textMuted}
              />
            )}
          </TouchableOpacity>

          {showStatusMenu && !isReadOnly && (
            <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    onStatusChange(s);
                    setShowStatusMenu(false);
                  }}
                  style={[
                    styles.menuItem,
                    status === s && { backgroundColor: theme.primary + '20' },
                  ]}
                  accessible={true}
                  accessibilityLabel={`Establecer estado a ${s}`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={{
                      'Pendiente': 'time-outline',
                      'En progreso': 'play-circle-outline',
                      'Revisión': 'checkmark-done-outline',
                      'Completada': 'checkmark-circle-outline',
                      'Cancelada': 'close-circle-outline',
                    }[s]}
                    size={16}
                    color={theme.primary}
                  />
                  <Text style={[styles.menuText, { color: theme.text }]}>{s}</Text>
                  {status === s && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* FECHA VENCIMIENTO */}
        <View>
          <Text style={[styles.label, { color: theme.text }]}>Vencimiento</Text>
          <TouchableOpacity
            disabled={isReadOnly}
            onPress={() => onDueDateChange(new Date())}
            style={[
              styles.metaButton,
              { backgroundColor: isDark ? theme.glass : theme.glassStrong },
            ]}
            accessible={true}
            accessibilityLabel={`Vencimiento: ${formatDate(dueDate)}`}
            accessibilityHint="Presiona para cambiar la fecha de vencimiento"
            accessibilityRole="button"
          >
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {formatDate(dueDate)}
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
