/**
 * TaskSubtasksSection.js
 * 
 * Sección de subtareas en TaskDetailScreen
 * Muestra lista de subtareas + botón para generar con IA
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../GlassCard';
import SubtasksList from '../SubtasksList';
import AiSubtasksModal from './AiSubtasksModal';
import { generateSubtasks } from '../../utils/aiFeatures';

export default function TaskSubtasksSection({
  task = null,
  title = '',
  description = '',
  subtasks = [],
  onAddSubtask = () => {},
  onRemoveSubtask = () => {},
  onUpdateSubtask = () => {},
  canAddSubtask = false,
  canEdit = false,
}) {
  const { theme, isDark } = useTheme();
  const [showAiSubtasksModal, setShowAiSubtasksModal] = useState(false);
  const [aiSubtaskOptions, setAiSubtaskOptions] = useState([]);
  const [aiPendingSubtasks, setAiPendingSubtasks] = useState([]);

  const handleGenerateSubtasks = () => {
    if (title.length < 6) {
      return;
    }

    const result = generateSubtasks(title, description);
    setAiSubtaskOptions(result.subtasks.map((st) => ({ title: st, checked: true })));
    setShowAiSubtasksModal(true);
  };

  const handleApplyAiSubtasks = (selected) => {
    setAiPendingSubtasks(selected);
    setShowAiSubtasksModal(false);
  };

  return (
    <View style={styles.container}>
      {task && subtasks.length > 0 && canAddSubtask && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Subtareas
          </Text>

          <GlassCard style={{ gap: 12 }}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Ionicons name="list-outline" size={18} color={theme.primary} />
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  {subtasks.length} {subtasks.length === 1 ? 'subtarea' : 'subtareas'}
                </Text>
              </View>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => onAddSubtask()}
                  accessible={true}
                  accessibilityLabel="Agregar subtarea"
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>

            <SubtasksList
              subtasks={subtasks}
              onRemove={onRemoveSubtask}
              onUpdate={onUpdateSubtask}
              canEdit={canEdit}
              theme={theme}
            />
          </GlassCard>
        </>
      )}

      {/* AI SUBTASKS GENERATION */}
      {canEdit && title.length >= 6 && (
        <View style={styles.aiSection}>
          <TouchableOpacity
            style={[
              styles.aiSubtasksBtn,
              { backgroundColor: theme.primaryAlpha, borderColor: theme.secondary ?? theme.primary },
            ]}
            onPress={handleGenerateSubtasks}
            accessible={true}
            accessibilityLabel="Generar subtareas con IA"
            accessibilityHint="Presiona para que IA sugiera subtareas basadas en el título"
            accessibilityRole="button"
          >
            <Ionicons name="sparkles" size={15} color={theme.secondary ?? theme.primary} />
            <Text style={[styles.aiSubtasksBtnText, { color: theme.secondary ?? theme.primary }]}>
              Sugerir subtareas con IA
            </Text>
          </TouchableOpacity>

          {/* PENDING SUBTASKS CHIPS */}
          {!task && aiPendingSubtasks.length > 0 && (
            <View style={[styles.aiPendingChips, { backgroundColor: theme.primaryAlpha }]}>
              <Text style={[styles.aiPendingLabel, { color: theme.textSecondary }]}>
                Se crearán {aiPendingSubtasks.length} subtarea{aiPendingSubtasks.length > 1 ? 's' : ''} al guardar:
              </Text>
              <View style={styles.chipsContainer}>
                {aiPendingSubtasks.map((st, i) => (
                  <View key={`pending-${st}-${i}`} style={[styles.aiPendingChip, { backgroundColor: theme.glass }]}>
                    <Text style={{ fontSize: 12, color: theme.secondary, flex: 1 }} numberOfLines={1}>
                      {st}
                    </Text>
                    {canEdit && (
                      <TouchableOpacity
                        onPress={() =>
                          setAiPendingSubtasks((prev) =>
                            prev.filter((_, j) => j !== i)
                          )
                        }
                        accessible={true}
                        accessibilityLabel={`Remover subtarea ${st}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle" size={14} color={theme.secondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* AI SUBTASKS MODAL */}
      <AiSubtasksModal
        visible={showAiSubtasksModal}
        onClose={() => setShowAiSubtasksModal(false)}
        options={aiSubtaskOptions}
        onApply={handleApplyAiSubtasks}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiSection: {
    gap: 12,
  },
  aiSubtasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  aiSubtasksBtnText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  aiPendingChips: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  aiPendingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aiPendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
