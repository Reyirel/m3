/**
 * TaskAISuggestions.js - Panel de sugerencias IA
 * 
 * Muestra sugerencias de prioridad, fechas, subtareas, etc.
 * Componente colapsable para no saturar
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../GlassCard';

export default function TaskAISuggestions({
  onSuggestPriority = () => {},
  onSuggestDueDate = () => {},
  onSuggestSubtasks = () => {},
  onFindSimilarTasks = () => {},
  isLoading = false,
  suggestions = {
    priority: null,
    dueDate: null,
    subtasks: [],
    similarTasks: [],
  },
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('priority');

  const hasSuggestions = 
    suggestions.priority ||
    suggestions.dueDate ||
    (suggestions.subtasks && suggestions.subtasks.length > 0) ||
    (suggestions.similarTasks && suggestions.similarTasks.length > 0);

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
        accessibilityLabel="Sugerencias de IA"
        accessibilityHint="Presiona para ver sugerencias inteligentes"
        accessibilityRole="button"
        accessibilityExpanded={isExpanded}
      >
        <View style={styles.expandHeaderLeft}>
          <Ionicons name="sparkles" size={18} color={theme.primary} />
          <Text style={[styles.expandHeaderText, { color: theme.text }]}>
            Sugerencias IA
          </Text>
          {hasSuggestions && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>
                {(suggestions.priority ? 1 : 0) +
                  (suggestions.dueDate ? 1 : 0) +
                  (suggestions.subtasks?.length || 0) +
                  (suggestions.similarTasks?.length || 0)}
              </Text>
            </View>
          )}
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.textMuted}
          />
        )}
      </TouchableOpacity>

      {/* CONTENIDO EXPANDIBLE */}
      {isExpanded && (
        <GlassCard>
          {/* TABS */}
          <View style={styles.tabs}>
            {[
              { id: 'priority', label: 'Prioridad', icon: 'flag-outline' },
              { id: 'duedate', label: 'Fecha', icon: 'calendar-outline' },
              { id: 'subtasks', label: 'Subtareas', icon: 'list-outline' },
              { id: 'similar', label: 'Similares', icon: 'copy-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  activeTab === tab.id && {
                    borderBottomColor: theme.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                accessible={true}
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.id ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: activeTab === tab.id ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CONTENIDO RELATIVO A TABS */}
          <View style={styles.tabContent}>
            {/* PRIORIDAD */}
            {activeTab === 'priority' && (
              <View style={styles.tabPane}>
                {suggestions.priority ? (
                  <View
                    style={[
                      styles.suggestionCard,
                      { backgroundColor: theme.primary + '15' },
                    ]}
                  >
                    <View style={styles.suggestionHeader}>
                      <Ionicons
                        name="flag"
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={[styles.suggestionTitle, { color: theme.text }]}>
                        Prioridad sugerida: {suggestions.priority}
                      </Text>
                    </View>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => onSuggestPriority(suggestions.priority)}
                        style={[
                          styles.applyButton,
                          { backgroundColor: theme.primary },
                        ]}
                        accessible={true}
                        accessibilityLabel={`Aplicar prioridad ${suggestions.priority}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="checkmark" size={16} color="white" />
                        <Text style={styles.applyButtonText}>Aplicar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onSuggestPriority}
                    disabled={isLoading}
                    style={[
                      styles.actionButton,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel="Generar sugerencia de prioridad"
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Generar sugerencia
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* FECHA */}
            {activeTab === 'duedate' && (
              <View style={styles.tabPane}>
                {suggestions.dueDate ? (
                  <View
                    style={[
                      styles.suggestionCard,
                      { backgroundColor: theme.primary + '15' },
                    ]}
                  >
                    <View style={styles.suggestionHeader}>
                      <Ionicons
                        name="calendar"
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={[styles.suggestionTitle, { color: theme.text }]}>
                        Fecha sugerida:{' '}
                        {new Date(suggestions.dueDate).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => onSuggestDueDate(suggestions.dueDate)}
                        style={[
                          styles.applyButton,
                          { backgroundColor: theme.primary },
                        ]}
                        accessible={true}
                        accessibilityLabel="Aplicar fecha sugerida"
                        accessibilityRole="button"
                      >
                        <Ionicons name="checkmark" size={16} color="white" />
                        <Text style={styles.applyButtonText}>Aplicar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onSuggestDueDate}
                    disabled={isLoading}
                    style={[
                      styles.actionButton,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel="Generar sugerencia de fecha"
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Sugerir fecha
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* SUBTAREAS */}
            {activeTab === 'subtasks' && (
              <View style={styles.tabPane}>
                {suggestions.subtasks && suggestions.subtasks.length > 0 ? (
                  <View style={styles.suggestionsList}>
                    {suggestions.subtasks.map((subtask, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.suggestionItem,
                          { backgroundColor: theme.primary + '15' },
                        ]}
                        accessible={true}
                        accessibilityLabel={`Subtarea: ${subtask}`}
                      >
                        <Text style={[styles.suggestionText, { color: theme.text }]}>
                          {subtask}
                        </Text>
                        {!isReadOnly && (
                          <TouchableOpacity
                            accessible={true}
                            accessibilityLabel={`Agregar subtarea ${subtask}`}
                            accessibilityRole="button"
                          >
                            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onSuggestSubtasks}
                    disabled={isLoading}
                    style={[
                      styles.actionButton,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel="Generar subtareas con IA"
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Generar subtareas
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* TAREAS SIMILARES */}
            {activeTab === 'similar' && (
              <View style={styles.tabPane}>
                {suggestions.similarTasks && suggestions.similarTasks.length > 0 ? (
                  <View style={styles.suggestionsList}>
                    {suggestions.similarTasks.map((task, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.suggestionItem,
                          { backgroundColor: theme.primary + '15' },
                        ]}
                        accessible={true}
                        accessibilityLabel={`Tarea similar: ${task.title}`}
                        accessibilityRole="button"
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionText, { color: theme.text }]}>
                            {task.title}
                          </Text>
                          {task.status && (
                            <Text style={[styles.suggestionMeta, { color: theme.textMuted }]}>
                              {task.status}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onFindSimilarTasks}
                    disabled={isLoading}
                    style={[
                      styles.actionButton,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel="Buscar tareas similares"
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color={theme.primary} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Buscar similares
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
    gap: 8,
  },
  expandHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: -16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 100,
  },
  tabPane: {
    gap: 12,
  },
  suggestionCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionMeta: {
    fontSize: 11,
    marginTop: 2,
  },
});
