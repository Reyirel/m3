/**
 * TaskAdvancedOptions.js - Opciones avanzadas
 * 
 * Recurrencia, subtareas, notificaciones, etiquetas
 * Componente colapsable para no saturar pantalla
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../GlassCard';

const RECURRENCE_PATTERNS = [
  { label: 'No repetir', value: 'none' },
  { label: 'Diario', value: 'daily' },
  { label: 'Cada 2 días', value: 'every2days' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Cada 2 semanas', value: 'biweekly' },
  { label: 'Mensual', value: 'monthly' },
];

export default function TaskAdvancedOptions({
  isRecurring = false,
  onRecurringChange = () => {},
  recurrencePattern = 'none',
  onRecurrencePatternChange = () => {},
  tags = [],
  onTagsChange = () => {},
  notifyBefore = 0,
  onNotifyBeforeChange = () => {},
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showRecurrenceMenu, setShowRecurrenceMenu] = React.useState(false);
  const [newTag, setNewTag] = React.useState('');

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const notifyOptions = [
    { label: 'Sin notificación', value: 0 },
    { label: '5 minutos antes', value: 5 },
    { label: '15 minutos antes', value: 15 },
    { label: '1 hora antes', value: 60 },
    { label: '1 día antes', value: 1440 },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER COLAPSABLE */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={[
          styles.expandHeader,
          {
            backgroundColor: isDark ? theme.glass : theme.glassStrong,
            borderColor: theme.glassBorder,
          },
        ]}
        accessible={true}
        accessibilityLabel="Opciones avanzadas"
        accessibilityHint={isExpanded ? 'Presiona para contraer' : 'Presiona para expandir'}
        accessibilityRole="button"
        accessibilityExpanded={isExpanded}
      >
        <View style={styles.expandHeaderLeft}>
          <Ionicons name="settings-outline" size={18} color={theme.primary} />
          <Text style={[styles.expandHeaderText, { color: theme.text }]}>
            Opciones Avanzadas
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={theme.textMuted}
        />
      </TouchableOpacity>

      {/* CONTENIDO EXPANDIBLE */}
      {isExpanded && (
        <GlassCard style={{ gap: 16 }}>
          {/* RECURRENCIA */}
          <View>
            <View style={styles.optionHeader}>
              <View style={styles.optionLabel}>
                <Ionicons name="repeat-outline" size={16} color={theme.primary} />
                <Text style={[styles.label, { color: theme.text }]}>
                  Repetir tarea
                </Text>
              </View>
              {!isReadOnly && (
                <Switch
                  value={isRecurring}
                  onValueChange={onRecurringChange}
                  accessible={true}
                  accessibilityLabel="Repetir tarea"
                  accessibilityRole="switch"
                />
              )}
            </View>

            {isRecurring && !isReadOnly && (
              <View style={styles.optionContent}>
                <TouchableOpacity
                  onPress={() => setShowRecurrenceMenu(!showRecurrenceMenu)}
                  style={[
                    styles.selectButton,
                    { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                  ]}
                  accessible={true}
                  accessibilityLabel={`Patrón de recurrencia: ${RECURRENCE_PATTERNS.find((p) => p.value === recurrencePattern)?.label}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.selectText, { color: theme.text }]}>
                    {RECURRENCE_PATTERNS.find(
                      (p) => p.value === recurrencePattern
                    )?.label}
                  </Text>
                  <Ionicons
                    name={showRecurrenceMenu ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>

                {showRecurrenceMenu && (
                  <View
                    style={[
                      styles.menu,
                      { backgroundColor: theme.card, borderColor: theme.glassBorder },
                    ]}
                  >
                    {RECURRENCE_PATTERNS.map((pattern) => (
                      <TouchableOpacity
                        key={pattern.value}
                        onPress={() => {
                          onRecurrencePatternChange(pattern.value);
                          setShowRecurrenceMenu(false);
                        }}
                        style={[
                          styles.menuItem,
                          recurrencePattern === pattern.value &&
                            { backgroundColor: theme.primary + '20' },
                        ]}
                        accessible={true}
                        accessibilityLabel={`Establecer a ${pattern.label}`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.menuText, { color: theme.text }]}>
                          {pattern.label}
                        </Text>
                        {recurrencePattern === pattern.value && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={theme.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* NOTIFICACIONES */}
          <View>
            <View style={styles.optionHeader}>
              <View style={styles.optionLabel}>
                <Ionicons name="notifications-outline" size={16} color={theme.primary} />
                <Text style={[styles.label, { color: theme.text }]}>
                  Notificar antes
                </Text>
              </View>
            </View>

            {!isReadOnly && (
              <View style={styles.optionContent}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.notifyScroll}
                >
                  {notifyOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => onNotifyBeforeChange(opt.value)}
                      style={[
                        styles.notifyPill,
                        {
                          backgroundColor:
                            notifyBefore === opt.value
                              ? theme.primary
                              : isDark
                              ? theme.glass
                              : theme.glassStrong,
                        },
                      ]}
                      accessible={true}
                      accessibilityLabel={`Notificar ${opt.label}`}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.notifyPillText,
                          {
                            color:
                              notifyBefore === opt.value
                                ? 'white'
                                : theme.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ETIQUETAS */}
          <View>
            <View style={styles.optionHeader}>
              <View style={styles.optionLabel}>
                <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
                <Text style={[styles.label, { color: theme.text }]}>
                  Etiquetas
                </Text>
              </View>
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsList}>
                {tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tagItem,
                      { backgroundColor: theme.primary + '20' },
                    ]}
                    accessible={true}
                    accessibilityLabel={`Etiqueta: ${tag}`}
                    accessibilityHint="Desliza para eliminar"
                  >
                    <Text style={[styles.tagText, { color: theme.primary }]}>
                      {tag}
                    </Text>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => removeTag(tag)}
                        accessible={true}
                        accessibilityLabel={`Remover etiqueta ${tag}`}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={16}
                          color={theme.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!isReadOnly && (
              <View style={styles.addTagRow}>
                <View
                  style={[
                    styles.tagInput,
                    {
                      backgroundColor: isDark ? theme.glass : theme.glassStrong,
                      borderColor: theme.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.tagPlaceholder, { color: theme.textMuted }]}>
                    {newTag || 'Nueva etiqueta...'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={addTag}
                  accessible={true}
                  accessibilityLabel="Agregar etiqueta"
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  expandHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionContent: {
    marginTop: 8,
    gap: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectText: {
    fontSize: 13,
    fontWeight: '500',
  },
  menu: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notifyScroll: {
    marginHorizontal: -4,
  },
  notifyPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  notifyPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagPlaceholder: {
    fontSize: 13,
  },
});
