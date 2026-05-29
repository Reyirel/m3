/**
 * PrioritySelector.js
 * Selector de prioridad — píldoras compactas en fila horizontal
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const PRIORITIES = [
  { value: 'baja',    label: 'Baja',    icon: 'arrow-down',  color: '#34C759' },
  { value: 'media',   label: 'Media',   icon: 'remove',      color: '#FF9500' },
  { value: 'alta',    label: 'Alta',    icon: 'arrow-up',    color: '#FF6B00' },
  { value: 'critica', label: 'Crítica', icon: 'alert',       color: '#FF3B30' },
];

export default function PrioritySelector({ value = 'media', onChange = () => {}, disabled = false }) {
  const { isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Etiqueta */}
      <View style={styles.labelRow}>
        <Ionicons name="flash" size={13} color="#FF9500" />
        <Text style={[styles.label, { color: isDark ? 'rgba(235,235,245,0.50)' : 'rgba(60,60,67,0.50)' }]}>
          Prioridad
        </Text>
      </View>

      {/* Píldoras */}
      <View style={styles.row}>
        {PRIORITIES.map((p) => {
          const selected = value === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              onPress={() => !disabled && onChange(p.value)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                selected
                  ? { backgroundColor: p.color, borderColor: p.color }
                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7', borderColor: p.color + '50' },
              ]}
            >
              <Ionicons
                name={p.icon}
                size={13}
                color={selected ? '#FFFFFF' : p.color}
              />
              <Text style={[
                styles.pillLabel,
                { color: selected ? '#FFFFFF' : (isDark ? '#EBEBF5' : '#1C1C1E') },
                selected && { fontWeight: '700' },
              ]}>
                {p.label}
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
