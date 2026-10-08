/**
 * TaskFormBasic.js - Formulario básico: Título + Descripción
 * 
 * Componente simple y reutilizable para título y descripción
 * Accessible con labels, hints, y validación
 */

import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassmorphicInput from '../glass/GlassmorphicInput';
import GlassmorphicSection from '../glass/GlassmorphicSection';

export default function TaskFormBasic({
  title = '',
  onTitleChange = () => {},
  description = '',
  onDescriptionChange = () => {},
  isReadOnly = false,
  // Errores de validación al guardar: { title, description }
  errors = {},
}) {
  const { theme, isDark } = useTheme();

  return (
    <GlassmorphicSection
      title="Información Base"
      icon="document-text"
      collapsible={false}
    >
      <View style={styles.container}>
        {/* TÍTULO */}
        <GlassmorphicInput
          label="Título de la tarea"
          value={title}
          onChangeText={onTitleChange}
          placeholder="Describe la tarea..."
          icon="pencil"
          error={errors.title || ''}
          maxLength={100}
          accessible={true}
          accessibilityLabel="Título de la tarea"
          accessibilityHint="Ingresa el nombre o descripción breve de la tarea (máximo 100 caracteres)"
        />

        {/* DESCRIPCIÓN */}
        <View style={styles.descriptionSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Descripción (mínimo 10 caracteres)
          </Text>
          <TextInput
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Agrega detalles, notas, o instrucciones..."
            placeholderTextColor={theme.textMuted}
            style={[
              styles.descriptionInput,
              {
                backgroundColor: isDark ? theme.glass : theme.glassStrong,
                color: theme.text,
                borderColor: errors.description ? theme.error : theme.glassBorder,
              },
            ]}
            multiline
            numberOfLines={4}
            editable={!isReadOnly}
            maxLength={500}
            textAlignVertical="top"
            accessible={true}
            accessibilityLabel="Descripción de la tarea"
            accessibilityHint="Agrega detalles adicionales sobre la tarea (máximo 500 caracteres)"
          />
          <View style={styles.descriptionFooter}>
            <Text
              style={[styles.errorText, { color: theme.error }]}
              accessibilityLiveRegion="polite"
            >
              {errors.description || ''}
            </Text>
            <Text style={[styles.charCount, { color: theme.textMuted }]}>
              {description.length}/500
            </Text>
          </View>
        </View>
      </View>
    </GlassmorphicSection>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  descriptionSection: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  descriptionInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 100,
  },
  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
});
