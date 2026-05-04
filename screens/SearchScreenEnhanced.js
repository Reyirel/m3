/**
 * SearchScreenEnhanced.js
 * Pantalla de búsqueda mejorada con glasmorphism
 * Búsqueda avanzada con filtros, tabs, chips y resultado vacío
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicInput,
  GlassmorphicTabs,
  GlassmorphicChip,
  GlassmorphicEmptyState,
  GlassmorphicFilterChips,
  TaskCard,
} from '../components';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';

const SearchScreenEnhanced = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { tasks } = useTasks();
  const { width } = useResponsive();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'title', 'description', 'assignee'
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'date', 'priority'

  // Filtros disponibles
  const availableFilters = useMemo(() => [
    { id: 'pending', label: 'Pendientes', icon: 'time-outline' },
    { id: 'inProgress', label: 'En Progreso', icon: 'play-circle' },
    { id: 'completed', label: 'Completadas', icon: 'checkmark-circle' },
    { id: 'urgent', label: 'Urgentes', icon: 'flash' },
    { id: 'overdue', label: 'Vencidas', icon: 'alert-circle' },
  ], []);

  // Búsqueda y filtrado
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    let results = tasks.filter(task => {
      const matchesQuery =
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.area?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      // Filtros adicionales
      if (selectedFilters.includes('pending') && task.status !== 'pendiente') return false;
      if (selectedFilters.includes('inProgress') && task.status !== 'en_proceso') return false;
      if (selectedFilters.includes('completed') && task.status !== 'cerrada') return false;
      if (selectedFilters.includes('urgent') && task.priority !== 'alta') return false;
      if (selectedFilters.includes('overdue') && !task.isDueOverdue) return false;

      return true;
    });

    // Ordenar resultados
    if (sortBy === 'priority') {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      results.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    } else if (sortBy === 'date') {
      results.sort((a, b) => (b.dueDate || 0) - (a.dueDate || 0));
    }

    return results;
  }, [searchQuery, selectedFilters, sortBy, tasks]);

  const renderSearchResult = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('TaskDetail', { task: item })}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      <TaskCard task={item} />
    </TouchableOpacity>
  ), [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <ScreenHeader
        title="Búsqueda Avanzada"
        subtitle="Encuentra tus tareas rápidamente"
        icon="search"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Input */}
        <View style={styles.section}>
          <GlassmorphicInput
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="search"
            editable={true}
          />
        </View>

        {searchQuery.trim() && (
          <>
            {/* Search Type Tabs */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Tipo de Búsqueda</Text>
              <GlassmorphicTabs
                tabs={[
                  { id: 'all', label: 'Todo', icon: 'layers-outline' },
                  { id: 'title', label: 'Título', icon: 'text' },
                  { id: 'description', label: 'Descripción', icon: 'document-outline' },
                  { id: 'assignee', label: 'Asignado', icon: 'person-outline' },
                ]}
                activeTab={searchType}
                onChange={setSearchType}
              />
            </View>

            {/* Filter Chips */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Filtros</Text>
              <GlassmorphicFilterChips
                items={availableFilters}
                selectedIds={selectedFilters}
                onSelectChange={setSelectedFilters}
                variant="filter"
                horizontal={true}
              />
            </View>

            {/* Sort Options */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Ordenar Por</Text>
              <View style={styles.sortButtons}>
                {[
                  { id: 'relevance', label: 'Relevancia', icon: 'star' },
                  { id: 'priority', label: 'Prioridad', icon: 'flash' },
                  { id: 'date', label: 'Fecha', icon: 'calendar' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor: sortBy === option.id ? theme.primary : (isDark ? theme.glass : 'rgba(255,255,255,0.85)'),
                        borderColor: sortBy === option.id ? theme.primary : (isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)'),
                      },
                      Platform.OS === 'web' && { cursor: 'pointer' },
                    ]}
                    onPress={() => setSortBy(option.id)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={sortBy === option.id ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.sortButtonText,
                        {
                          color: sortBy === option.id ? '#fff' : theme.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Results */}
            <View style={styles.section}>
              <Text style={[styles.resultsLabel, { color: theme.text }]}>
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
              </Text>
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
              ) : (
                <GlassmorphicEmptyState
                  icon="search-outline"
                  title="No hay resultados"
                  message={`No encontramos tareas que coincidan con "${searchQuery}"`}
                  action={{
                    label: 'Limpiar búsqueda',
                    onPress: () => {
                      setSearchQuery('');
                      setSelectedFilters([]);
                    },
                  }}
                  fullScreen={false}
                />
              )}
            </View>
          </>
        )}

        {!searchQuery.trim() && (
          <GlassmorphicEmptyState
            icon="search-outline"
            title="Comienza tu búsqueda"
            message="Escribe una palabra clave para encontrar tareas"
            action={{
              label: 'Ver todas las tareas',
              onPress: () => navigation.navigate('HomeScreen'),
            }}
            fullScreen={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SearchScreenEnhanced;
