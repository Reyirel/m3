import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function GlassChip({ label, icon, count, active = false, onPress }) {
  const { theme, isDark } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primaryAlpha : hovered ? (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.05)') : theme.glass,
          borderColor: active ? theme.primary : hovered ? theme.primary + '44' : theme.glassBorder,
          transform: [{ scale: hovered && !active ? 1.03 : 1 }],
        },
      ]}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      } : {})}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filtro: ${label}`}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={13}
          color={active ? theme.primary : theme.textSecondary}
        />
      )}
      <Text style={[styles.label, { color: active ? theme.primary : theme.textSecondary }]}>
        {label}
      </Text>
      {count != null && count > 0 && (
        <View style={[styles.badge, {
          backgroundColor: active ? theme.primaryAlpha : theme.surfaceL3,
        }]}>
          <Text style={[styles.badgeText, { color: active ? theme.primary : theme.textSecondary }]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
