// components/task/AiSubtasksModal.js
// Hoja para elegir cuáles de las subtareas sugeridas se agregan a la tarea.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addSubtask } from '../../services/tasksMultiple';
import PrimaryButton from '../ui/PrimaryButton';

/**
 * Props:
 *  visible           — boolean
 *  onClose           — () => void
 *  options           — array de { title: string, checked: boolean }
 *  category          — tipo de tarea reconocido ("Licitación"); vacío si no se reconoció
 *  onOptionsChange   — (newOptions) => void  (para togglear checks)
 *  editingTask       — objeto de tarea existente o null (si se está creando)
 *  onPendingSubtasks — (selected: string[]) => void  (al crear nueva tarea)
 *  theme             — objeto de tema
 *  isDark            — boolean
 *  showSuccess       — (msg) => void
 *  showError         — (msg) => void
 */
export default function AiSubtasksModal({
  visible,
  onClose,
  options,
  onOptionsChange,
  category = '',
  editingTask,
  onPendingSubtasks,
  theme,
  isDark,
  showSuccess,
  showError,
}) {
  const styles = createStyles(theme, isDark);

  const toggleOption = (index) => {
    onOptionsChange(options.map((o, i) => (i === index ? { ...o, checked: !o.checked } : o)));
  };

  const handleConfirm = async () => {
    const selected = options.filter((o) => o.checked).map((o) => o.title);
    onClose();
    if (selected.length === 0) return;

    if (editingTask) {
      try {
        await Promise.all(
          selected.map((st) => addSubtask(editingTask.id, { title: st, description: '' }))
        );
        showSuccess(
          `${selected.length} subtarea${selected.length !== 1 ? 's' : ''} creada${selected.length !== 1 ? 's' : ''}`
        );
      } catch (_) {
        showError('No se pudieron crear las subtareas');
      }
    } else {
      onPendingSubtasks(selected);
    }
  };

  const checkedCount = options.filter((o) => o.checked).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="list-outline" size={22} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Subtareas sugeridas</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {category
                  ? `Pasos habituales de una tarea de tipo "${category}". Elige los que apliquen.`
                  : 'No se reconoció el tipo de tarea: estos son pasos generales. Elige los que apliquen.'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Lista */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt.title}
                style={[
                  styles.row,
                  {
                    backgroundColor: opt.checked ? theme.primaryAlpha : theme.card,
                    borderColor: opt.checked ? theme.primary : theme.borderLight,
                  },
                ]}
                onPress={() => toggleOption(i)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: opt.checked }}
                accessibilityLabel={opt.title}
              >
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: opt.checked ? theme.primary : 'transparent',
                      borderColor: opt.checked ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {opt.checked && <Ionicons name="checkmark" size={13} color="#FFF" />}
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: theme.text, lineHeight: 18 }}>
                  {opt.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <PrimaryButton
              title="Cancelar"
              onPress={onClose}
              variant="secondary"
              size="medium"
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title={checkedCount === 1 ? 'Agregar 1 subtarea' : `Agregar ${checkedCount} subtareas`}
              onPress={handleConfirm}
              disabled={checkedCount === 0}
              size="medium"
              style={{ flex: 2 }}
              icon="add-circle"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (_theme, _isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: 12,
    },
    list: {
      maxHeight: 360,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
  });
