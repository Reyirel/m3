// components/StateStatusCards.js
// Tira compacta de 4 estados — sin tarjetas grandes para reducir saturación visual

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StateStatusCards({
  completed = 0,
  pending = 0,
  inProgress = 0,
  inReview = 0,
  onPress = null,
}) {
  const { theme, isDark } = useTheme();

  const STATES = [
    { key: 'completed',  label: 'Completadas', icon: 'checkmark-done-sharp', color: theme.success },
    { key: 'inProgress', label: 'En Proceso',  icon: 'play-circle',          color: theme.info },
    { key: 'pending',    label: 'Pendientes',  icon: 'alert-circle',         color: theme.warning },
    { key: 'inReview',   label: 'En Revisión', icon: 'eye-outline',          color: theme.secondary },
  ];

  const values = { completed, inProgress, pending, inReview };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Por Estado</Text>

      <View style={[styles.strip, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        {STATES.map((state, i) => {
          const value = values[state.key];
          return (
            <React.Fragment key={state.key}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]} />}
              <TouchableOpacity
                style={styles.cell}
                activeOpacity={onPress ? 0.7 : 1}
                onPress={onPress ? () => onPress(state.key) : undefined}
              >
                <View style={[styles.iconDot, { backgroundColor: isDark ? `${state.color}22` : `${state.color}18` }]}>
                  <Ionicons name={state.icon} size={14} color={state.color} />
                </View>
                <Text style={[styles.value, { color: state.color }]}>{value}</Text>
                <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
                  {state.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  strip: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 4,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    marginVertical: 12,
  },
});
