/**
 * AreaSelector.js
 * Trigger compacto que abre AreaSelectorModal
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import AreaSelectorModal from '../AreaSelectorModal';
import { TODAS_LAS_AREAS } from '../../config/areas';

export default function AreaSelector({
  value = [],
  onChange = () => {},
  multiple = true,
  disabled = false,
}) {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const hasAreas = value.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Etiqueta */}
      <View style={styles.labelRow}>
        <Ionicons name="layers" size={13} color={theme.primary} />
        <Text style={[styles.label, { color: isDark ? 'rgba(235,235,245,0.50)' : 'rgba(60,60,67,0.50)' }]}>
          Áreas responsables
        </Text>
        {hasAreas && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{value.length}</Text>
          </View>
        )}
      </View>

      {/* Trigger */}
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.75}
        style={[
          styles.trigger,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
            borderColor: hasAreas ? theme.primary + '60' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
          },
        ]}
      >
        <Ionicons
          name={hasAreas ? 'layers' : 'layers-outline'}
          size={18}
          color={hasAreas ? theme.primary : (isDark ? 'rgba(235,235,245,0.40)' : 'rgba(60,60,67,0.40)')}
        />
        <Text style={[
          styles.triggerText,
          { color: hasAreas ? theme.text : (isDark ? 'rgba(235,235,245,0.40)' : 'rgba(60,60,67,0.40)') },
        ]}>
          {hasAreas ? `${value.length} área${value.length > 1 ? 's' : ''} seleccionada${value.length > 1 ? 's' : ''}` : 'Seleccionar áreas…'}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isDark ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.30)'}
        />
      </TouchableOpacity>

      {/* Chips de áreas seleccionadas */}
      {hasAreas && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chips}>
            {value.map((area) => (
              <TouchableOpacity
                key={area}
                onPress={() => !disabled && onChange(value.filter(a => a !== area))}
                style={[styles.chip, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '50' }]}
              >
                <Text style={[styles.chipText, { color: theme.primary }]} numberOfLines={1}>
                  {area.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                </Text>
                <Ionicons name="close-circle" size={14} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Modal */}
      <AreaSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedAreas={value}
        onAreasChange={onChange}
        allAreas={TODAS_LAS_AREAS}
        theme={theme}
        isDark={isDark}
      />
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
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  chipsScroll: {
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
