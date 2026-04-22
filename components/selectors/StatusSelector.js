/**
 * StatusSelector.js
 * Selector de estado — píldoras compactas en fila horizontal
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const STATUSES = [
  { value: 'pendiente',   label: 'Pendiente',   icon: 'time-outline',             color: '#8E8E93' },
  { value: 'en_progreso', label: 'En Progreso',  icon: 'play-circle-outline',      color: '#007AFF' },
  { value: 'completado',  label: 'Completado',   icon: 'checkmark-circle-outline', color: '#34C759' },
  { value: 'bloqueado',   label: 'Bloqueado',    icon: 'lock-closed-outline',      color: '#FF3B30' },
];

export default function StatusSelector({ value = 'pendiente', onChange = () => {}, disabled = false }) {
  const { isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Etiqueta */}
      <View style={styles.labelRow}>
        <Ionicons name="layers" size={13} color="#007AFF" />
        <Text style={[styles.label, { color: isDark ? 'rgba(235,235,245,0.50)' : 'rgba(60,60,67,0.50)' }]}>
          Estado
        </Text>
      </View>

      {/* Píldoras */}
      <View style={styles.row}>
        {STATUSES.map((s) => {
          const selected = value === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              onPress={() => !disabled && onChange(s.value)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                selected
                  ? { backgroundColor: s.color, borderColor: s.color }
                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7', borderColor: s.color + '50' },
              ]}
            >
              <Ionicons
                name={s.icon}
                size={13}
                color={selected ? '#FFFFFF' : s.color}
              />
              <Text style={[
                styles.pillLabel,
                { color: selected ? '#FFFFFF' : (isDark ? '#EBEBF5' : '#1C1C1E') },
                selected && { fontWeight: '700' },
              ]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
