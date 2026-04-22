// components/AreaFilter.js
// Componente de filtrado y selección de áreas

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function AreaFilter({
  areas = [],
  selectedAreas = [],
  onSelectionChange,
  maxVisible = 3,
}) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const handleSelectArea = (area) => {
    if (selectedAreas.includes(area)) {
      onSelectionChange(selectedAreas.filter(a => a !== area));
    } else {
      onSelectionChange([...selectedAreas, area]);
    }
  };

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectAll = () => {
    if (selectedAreas.length === areas.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(areas);
    }
  };

  const _rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const visibleAreas = selectedAreas.length > 0 
    ? selectedAreas 
    : areas.slice(0, maxVisible);
  const hiddenCount = Math.max(0, areas.length - visibleAreas.length);
  const hasData = areas.length > 0 && areas[0] !== 'Sin datos';

  return (
    <View style={styles.container}>
      {/* Header with title */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons name="funnel-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.title, { color: theme.text }]}>Filtrar por Área</Text>
        </View>
        {hasData && (
          <TouchableOpacity 
            onPress={handleSelectAll}
            style={styles.selectAllButton}
          >
            <Text style={[styles.selectAllText, { color: theme.primary }]}>
              {selectedAreas.length === areas.length ? 'Limpiar' : 'Todo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {hasData ? (
        <>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {visibleAreas.map((area) => {
              const isSelected = selectedAreas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  onPress={() => handleSelectArea(area)}
                  style={[
                    styles.chip,
                    isSelected 
                      ? [styles.chipSelected, { backgroundColor: theme.primary }]
                      : [styles.chipUnselected, { borderColor: theme.border }]
                  ]}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={theme.text}
                      style={styles.chipIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      isSelected 
                        ? { color: '#FFFFFF' }
                        : { color: theme.textSecondary }
                    ]}
                    numberOfLines={1}
                  >
                    {area}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {hiddenCount > 0 && !isExpanded && (
              <TouchableOpacity
                onPress={handleToggleExpand}
                style={[styles.chip, styles.moreChip, { borderColor: theme.border }]}
              >
                <Text style={[styles.chipText, { color: theme.textSecondary }]}>
                  +{hiddenCount}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Expanded selector */}
          {isExpanded && (
            <View style={[styles.expandedContainer, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
              <View style={styles.expandedHeader}>
                <Text style={[styles.expandedTitle, { color: theme.text }]}>
                  Selecciona las áreas a mostrar
                </Text>
                <TouchableOpacity onPress={handleToggleExpand}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.expandedList}>
                {areas.map((area) => {
                  const isSelected = selectedAreas.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      onPress={() => handleSelectArea(area)}
                      style={[
                        styles.expandedItem,
                        { borderBottomColor: theme.border }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected 
                            ? { backgroundColor: theme.primary, borderColor: theme.primary }
                            : { borderColor: theme.border }
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                      <Text
                        style={[styles.expandedItemText, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Info about selection */}
          {selectedAreas.length > 0 && (
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {selectedAreas.length} área{selectedAreas.length > 1 ? 's' : ''} seleccionada{selectedAreas.length > 1 ? 's' : ''}
            </Text>
          )}
        </>
      ) : (
        /* Empty State */
        <View style={[styles.emptyStateContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
          <Ionicons name="bar-chart-outline" size={32} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Sin áreas disponibles
          </Text>
          <Text style={[styles.emptyStateCaption, { color: theme.textSecondary }]}>
            Crea tareas con áreas asignadas
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsContainer: {
    marginBottom: 8,
  },
  chipsContent: {
    gap: 8,
    paddingHorizontal: 0,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  chipSelected: {
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chipUnselected: {
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  moreChip: {
    justifyContent: 'center',
  },
  expandedContainer: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  expandedList: {
    maxHeight: 300,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedItemText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyStateContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyStateCaption: {
    fontSize: 11,
    fontWeight: '500',
  },
});
