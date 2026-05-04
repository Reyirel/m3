/**
 * TaskFormBasic.js - Formulario básico: Título + Descripción
 * 
 * Componente simple y reutilizable para título y descripción
 * Accessible con labels, hints, y validación
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import ShakeInput from '../ShakeInput';
import GlassmorphicInput from '../glass/GlassmorphicInput';
import GlassmorphicSection from '../glass/GlassmorphicSection';

export default function TaskFormBasic({
  title = '',
  onTitleChange = () => {},
  description = '',
  onDescriptionChange = () => {},
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();
  const [titleError, setTitleError] = React.useState('');

  const handleTitleChange = (text) => {
    setTitleError(text.trim().length === 0 ? 'El título es requerido' : '');
    onTitleChange(text);
  };

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
          onChangeText={handleTitleChange}
          placeholder="Describe la tarea..."
          icon="pencil"
          error={titleError}
          maxLength={120}
          accessible={true}
          accessibilityLabel="Título de la tarea"
          accessibilityHint="Ingresa el nombre o descripción breve de la tarea (máximo 120 caracteres)"
        />

        {/* DESCRIPCIÓN */}
        <View style={styles.descriptionSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Descripción (opcional)
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
                borderColor: theme.glassBorder,
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
          <Text style={[styles.charCount, { color: theme.textMuted }]}>
            {description.length}/500
          </Text>
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  descriptionInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});
