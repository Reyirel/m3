import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium, hapticLight } from '../utils/haptics';

/**
 * AdvancedFilters component with modal
 * 
 * @param {object} filters - Current filter values
 * @param {function} onApplyFilters - Callback when filters are applied
 * @param {array} areas - Available areas to filter
 * @param {array} users - Available users to filter
 * @param {array} tasks - All tasks (to extract tags)
 */
const AdvancedFilters = ({ filters, onApplyFilters, areas = [], users = [], tasks = [] }) => {
  const { theme, isDark } = useTheme();
  const chipBaseStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : theme.glassStrong,
    borderColor: theme.glassBorder,
  };
  const chipTextColor = { color: isDark ? '#E5E7EB' : theme.text };
  const [modalVisible, setModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  // Extract unique tags from all tasks
  const allTags = React.useMemo(() => {
    const tagSet = new Set();
    tasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  const openModal = useCallback(() => {
    hapticLight();
    setTempFilters(filters);
    setModalVisible(true);
  }, [filters]);

  const closeModal = useCallback(() => {
    hapticLight();
    setModalVisible(false);
  }, []);

  const applyFilters = useCallback(() => {
    hapticMedium();
    onApplyFilters(tempFilters);
    setModalVisible(false);
  }, [tempFilters, onApplyFilters]);

  const resetFilters = useCallback(() => {
    hapticMedium();
    const reset = {
      areas: [],
      responsible: [],
      priorities: [],
      statuses: [],
      tags: [],
      overdue: false,
      dateRange: null,
    };
    setTempFilters(reset);
    onApplyFilters(reset);
    setModalVisible(false);
  }, [onApplyFilters]);

  const toggleArrayFilter = useCallback((key, value) => {
    hapticLight();
    setTempFilters(prev => {
      const current = prev[key] || [];
      const newValue = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
  }, []);

  const toggleBooleanFilter = useCallback((key) => {
    hapticLight();
    setTempFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Count active filters
  const activeCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'overdue' && value) return count + 1;
    if (Array.isArray(value) && value.length > 0) return count + value.length;
    if (value && !Array.isArray(value)) return count + 1;
    return count;
  }, 0);

  const priorities = [
    { key: 'alta', label: 'Alta', color: theme.error },
    { key: 'media', label: 'Media', color: theme.warning },
    { key: 'baja', label: 'Baja', color: theme.success },
  ];

  const statuses = [
    { key: 'pendiente', label: 'Pendiente', color: theme.warning },
    { key: 'en_proceso', label: 'En proceso', color: theme.info },
    { key: 'en_revision', label: 'En revisión', color: theme.secondary },
    { key: 'cerrada', label: 'Cerrada', color: theme.success },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <View style={[styles.filterGradient, { backgroundColor: activeCount > 0 ? theme.primary : theme.glassStrong }]}>
          <Ionicons
            name="filter"
            size={20}
            color={activeCount > 0 ? '#FFFFFF' : theme.textSecondary}
          />
          {activeCount > 0 && (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>{activeCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? theme.card : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filtros Avanzados</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Priorities */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Prioridad</Text>
                <View style={styles.chipContainer}>
                  {priorities.map(({ key, label, color }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        chipBaseStyle,
                        (tempFilters.priorities || []).includes(key) && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => toggleArrayFilter('priorities', key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          chipTextColor,
                          (tempFilters.priorities || []).includes(key) && styles.chipTextActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Estado</Text>
                <View style={styles.chipContainer}>
                  {statuses.map(({ key, label, color }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        chipBaseStyle,
                        (tempFilters.statuses || []).includes(key) && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => toggleArrayFilter('statuses', key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          chipTextColor,
                          (tempFilters.statuses || []).includes(key) && styles.chipTextActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Areas */}
              {areas.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Áreas</Text>
                  <View style={styles.chipContainer}>
                    {areas.map((area) => (
                      <TouchableOpacity
                        key={area}
                        style={[
                          styles.chip,
                          chipBaseStyle,
                          (tempFilters.areas || []).includes(area) && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => toggleArrayFilter('areas', area)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            chipTextColor,
                            (tempFilters.areas || []).includes(area) && styles.chipTextActive,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {area}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Responsibles */}
              {users.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Responsable</Text>
                  <View style={styles.chipContainer}>
                    {users.map((user) => (
                      <TouchableOpacity
                        key={user}
                        style={[
                          styles.chip,
                          chipBaseStyle,
                          (tempFilters.responsible || []).includes(user) && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => toggleArrayFilter('responsible', user)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            chipTextColor,
                            (tempFilters.responsible || []).includes(user) && styles.chipTextActive,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {user}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Overdue Toggle */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => toggleBooleanFilter('overdue')}
                  activeOpacity={0.7}
                >
                  <View style={styles.toggleLeft}>
                    <Ionicons name="alert-circle" size={24} color={theme.error} />
                    <Text style={[styles.toggleText, { color: theme.text }]}>Solo vencidas</Text>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      tempFilters.overdue && { ...styles.toggleActive, backgroundColor: theme.primary },
                    ]}
                  >
                    <View style={[styles.toggleThumb, tempFilters.overdue && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Tags */}
              {allTags.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Etiquetas</Text>
                  <View style={styles.chipContainer}>
                    {allTags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.chip,
                          (tempFilters.tags || []).includes(tag) && { ...styles.chipActive, backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => toggleArrayFilter('tags', tag)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            (tempFilters.tags || []).includes(tag) && styles.chipTextActive,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.resetButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
                activeOpacity={0.8}
              >
                <View style={[styles.applyGradient, { backgroundColor: theme.primary }]}>
                  <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  filterGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#9F2241',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '48%',
    flexShrink: 1
  },
  chipActive: {
    backgroundColor: '#9F2241',
    borderColor: '#9F2241',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    textAlign: 'center',
    flexShrink: 1
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#9F2241',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  applyButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default React.memo(AdvancedFilters);
