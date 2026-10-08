// components/task/TaskSubtasksSection.js
// Subtareas sugeridas en el formulario de tarea. Propone los pasos típicos del tipo de
// tarea que se reconoce en el título (utils/aiFeatures.js) y deja elegir cuáles agregar.
//   · Tarea que ya existe → las subtareas elegidas se crean en el momento.
//   · Tarea nueva        → quedan en espera y se crean al guardar la tarea.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { ACTIVE_OPACITY } from '../../theme/motion';
import AiSubtasksModal from './AiSubtasksModal';
import { generateSubtasks } from '../../utils/aiFeatures';

// Con menos letras el título no dice de qué trata la tarea
const MIN_TITLE_LENGTH = 6;

export default function TaskSubtasksSection({
  task = null,
  title = '',
  description = '',
  canEdit = false,
  pendingSubtasks = [],
  onPendingSubtasksChange = () => {},
}) {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [options, setOptions] = useState([]);
  const [category, setCategory] = useState('');

  if (!canEdit || title.trim().length < MIN_TITLE_LENGTH) return null;

  const openSuggestions = () => {
    const result = generateSubtasks(title, description);
    // Las que ya están en espera no se vuelven a proponer marcadas
    setOptions(result.subtasks.map((subtask) => ({ title: subtask, checked: !pendingSubtasks.includes(subtask) })));
    setCategory(result.confidence === 'baja' ? '' : result.category);
    setModalVisible(true);
  };

  const addPending = (selected) => {
    onPendingSubtasksChange([...new Set([...pendingSubtasks, ...selected])]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}
        onPress={openSuggestions}
        activeOpacity={ACTIVE_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Sugerir subtareas"
        accessibilityHint="Propone los pasos habituales para este tipo de tarea"
      >
        <Ionicons name="list-outline" size={18} color={theme.primary} />
        <View style={styles.buttonText}>
          <Text style={[styles.buttonTitle, { color: theme.text }]}>Sugerir subtareas</Text>
          <Text style={[styles.buttonHint, { color: theme.textSecondary }]}>
            Pasos habituales para este tipo de tarea
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
      </TouchableOpacity>

      {!task && pendingSubtasks.length > 0 && (
        <View style={[styles.pending, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
          <Text style={[styles.pendingTitle, { color: theme.textSecondary }]}>
            {pendingSubtasks.length === 1
              ? 'Se creará 1 subtarea al guardar'
              : `Se crearán ${pendingSubtasks.length} subtareas al guardar`}
          </Text>
          {pendingSubtasks.map((subtask) => (
            <View key={subtask} style={[styles.pendingRow, { borderTopColor: theme.borderLight }]}>
              <Text style={[styles.pendingText, { color: theme.text }]} numberOfLines={2}>{subtask}</Text>
              <TouchableOpacity
                onPress={() => onPendingSubtasksChange(pendingSubtasks.filter((item) => item !== subtask))}
                style={styles.remove}
                activeOpacity={ACTIVE_OPACITY}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`Quitar subtarea: ${subtask}`}
              >
                <Ionicons name="close" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <AiSubtasksModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        options={options}
        onOptionsChange={setOptions}
        category={category}
        editingTask={task}
        onPendingSubtasks={addPending}
        theme={theme}
        isDark={isDark}
        showSuccess={showSuccess}
        showError={showError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 56,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  buttonHint: {
    ...TYPOGRAPHY.caption,
  },
  pending: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.md,
  },
  pendingTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pendingText: {
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
  },
  remove: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
