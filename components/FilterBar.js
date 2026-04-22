// components/FilterBar.js
// Barra de filtros y búsqueda reutilizable. Permite filtrar por área, responsable, prioridad, vencidas y buscar por título.
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { AREAS } from '../config/areas';
import { GlassmorphicButton } from './index';

const FilterBar = memo(function FilterBar({ onFilterChange }) {
  const { theme, isDark } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const debounceTimer = useRef(null);

  const priorities = ['alta', 'media', 'baja'];

  const applyFilters = useCallback((updates = {}) => {
    const filters = {
      searchText: updates.searchText !== undefined ? updates.searchText : searchText,
      area: updates.area !== undefined ? updates.area : selectedArea,
      responsible: updates.responsible !== undefined ? updates.responsible : selectedResponsible,
      priority: updates.priority !== undefined ? updates.priority : selectedPriority,
      overdue: updates.overdue !== undefined ? updates.overdue : showOverdue
    };
    onFilterChange && onFilterChange(filters);
  }, [searchText, selectedArea, selectedResponsible, selectedPriority, showOverdue, onFilterChange]);

  const handleSearchChange = (text) => {
    setSearchText(text);
    
    // Limpiar el timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Aplicar filtro después de 300ms de inactividad
    debounceTimer.current = setTimeout(() => {
      applyFilters({ searchText: text });
    }, 300);
  };

  // Limpiar el timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const toggleArea = (area) => {
    const newArea = selectedArea === area ? '' : area;
    setSelectedArea(newArea);
    applyFilters({ area: newArea });
  };

  const togglePriority = (priority) => {
    const newPriority = selectedPriority === priority ? '' : priority;
    setSelectedPriority(newPriority);
    applyFilters({ priority: newPriority });
  };

  const toggleOverdue = () => {
    const newOverdue = !showOverdue;
    setShowOverdue(newOverdue);
    applyFilters({ overdue: newOverdue });
  };

  const clearAll = () => {
    setSearchText('');
    setSelectedArea('');
    setSelectedResponsible('');
    setSelectedPriority('');
    setShowOverdue(false);
    setIsExpanded(false);
    onFilterChange && onFilterChange({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  };

  const hasActiveFilters = selectedArea || selectedPriority || showOverdue;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Barra compacta con búsqueda y botón de filtros */}
      <View style={styles.compactBar}>
        {/* Glasmorphic Search Container */}
        <View style={[styles.searchContainer, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.80)',
          borderColor: theme.glassBorder,
        }]}>
          {Platform.OS !== 'web' && (
            <View style={StyleSheet.absoluteFillObject}>
              <BlurView
                intensity={isDark ? 40 : 35}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          <Ionicons name="search" size={18} color={theme.primary} style={{ zIndex: 2 }} />
          <TextInput
            placeholder="Buscar tareas..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
            value={searchText}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: theme.text, zIndex: 2 }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={{ zIndex: 2 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Glasmorphic Filter Button */}
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.filterButton, 
            { 
              backgroundColor: hasActiveFilters ? theme.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.80)'),
              borderColor: hasActiveFilters ? theme.primary : theme.glassBorder
            }
          ]}
        >
          {Platform.OS !== 'web' && !hasActiveFilters && (
            <View style={StyleSheet.absoluteFillObject}>
              <BlurView
                intensity={isDark ? 40 : 35}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          <Ionicons 
            name={isExpanded ? 'filter' : 'filter'} 
            size={18} 
            color={hasActiveFilters ? '#FFFFFF' : theme.primary}
            style={{ zIndex: 2 }}
          />
          {hasActiveFilters && (
            <View style={[styles.filterBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.filterBadgeText}>
                {[selectedArea, selectedPriority, showOverdue].filter(Boolean).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Panel de filtros expandible con glasmorphism */}
      {isExpanded && (
        <View style={[styles.expandedFilters, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)' }]}>
          {Platform.OS !== 'web' && (
            <View style={StyleSheet.absoluteFillObject}>
              <BlurView
                intensity={isDark ? 50 : 45}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          
          {/* Áreas */}
          <View style={[styles.filterSection, { zIndex: 2 }]}>
            <Text style={[styles.sectionLabel, { color: theme.primary }]}>ÁREA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {AREAS.map(area => (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[
                      styles.compactChip,
                      {
                        backgroundColor: selectedArea === area ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.80)'),
                        borderColor: selectedArea === area ? theme.primary : theme.glassBorderSubtle
                      }
                    ]}
                  >
                    <Text style={[
                      styles.compactChipText,
                      { color: selectedArea === area ? '#FFFFFF' : theme.text }
                    ]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Prioridades */}
          <View style={[styles.filterSection, { zIndex: 2 }]}>
            <Text style={[styles.sectionLabel, { color: theme.primary }]}>PRIORIDAD</Text>
            <View style={styles.chipRow}>
              {priorities.map(priority => (
                <TouchableOpacity
                  key={priority}
                  onPress={() => togglePriority(priority)}
                  style={[
                    styles.compactChip,
                    {
                      backgroundColor: selectedPriority === priority ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.80)'),
                      borderColor: selectedPriority === priority ? theme.primary : theme.glassBorderSubtle
                    }
                  ]}
                >
                  <Text style={[
                    styles.compactChipText,
                    { color: selectedPriority === priority ? '#FFFFFF' : theme.text }
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Vencidas */}
              <TouchableOpacity
                onPress={toggleOverdue}
                style={[
                  styles.compactChip,
                  {
                    backgroundColor: showOverdue ? theme.error : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.80)'),
                    borderColor: showOverdue ? theme.error : theme.glassBorderSubtle
                  }
                ]}
              >
                <Text style={[
                  styles.compactChipText,
                  { color: showOverdue ? '#FFFFFF' : theme.text }
                ]}>
                  Vencidas
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón limpiar con GlassmorphicButton */}
          {hasActiveFilters && (
            <View style={[styles.clearButtonContainer, { zIndex: 2 }]}>
              <GlassmorphicButton
                onPress={clearAll}
                variant="secondary"
                size="small"
                icon="close-circle"
                style={{ flex: 1 }}
              >
                Limpiar filtros
              </GlassmorphicButton>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  compactBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'transparent',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  expandedFilters: {
    marginTop: 12,
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  filterSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButtonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FilterBar;