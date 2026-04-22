/**
 * KanbanBoardScreen.js
 * Pantalla de tablero Kanban con columnas y tarjetas
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicHeader,
  GlassmorphicKanbanCard,
  GlassmorphicButton,
  GlassmorphicEmptyState,
} from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import AmbientOrbs from '../components/AmbientOrbs';
import { hapticMedium } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

const KanbanBoardScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { tasks } = useTasks();
  const { isTablet } = useResponsive();

  const [filterPriority, setFilterPriority] = useState('todas');
  const [expandedColumn, setExpandedColumn] = useState(null);

  // Define Kanban columns
  const columns = [
    { id: 'pendiente', label: 'Pendiente', icon: 'checkbox-outline', color: theme.info },
    { id: 'en_proceso', label: 'En Progreso', icon: 'play-circle-outline', color: theme.warning },
    { id: 'en_revision', label: 'En Revisión', icon: 'checkmark-done-outline', color: theme.primary },
    { id: 'cerrada', label: 'Completada', icon: 'checkmark-circle-outline', color: theme.success },
  ];

  // Group tasks by status and filter
  const kanbanData = useMemo(() => {
    return columns.map(column => {
      let columnTasks = tasks.filter(
        task => (task.status === column.id || 
                (column.id === 'en_proceso' && task.status === 'en_progreso'))
      );

      if (filterPriority !== 'todas') {
        columnTasks = columnTasks.filter(task => task.priority === filterPriority);
      }

      return {
        ...column,
        count: columnTasks.length,
        tasks: columnTasks,
      };
    });
  }, [tasks, filterPriority]);

  const totalTasks = kanbanData.reduce((sum, col) => sum + col.count, 0);

  const handleCardPress = useCallback((task) => {
    hapticMedium();
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);

  const renderColumnHeader = useCallback((column) => (
    <View
      style={[
        styles.columnHeader,
        {
          backgroundColor: column.color,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          marginBottom: 12,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={column.icon} size={16} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
          {column.label}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
        ]}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
          {column.count}
        </Text>
      </View>
    </View>
  ), []);

  const renderKanbanCard = useCallback(({ item }) => (
    <GlassmorphicKanbanCard
      id={item.id}
      title={item.title}
      description={item.description}
      priority={item.priority}
      assignee={item.assignedTo}
      dueDate={item.dueAt}
      tags={item.tags || []}
      onPress={() => handleCardPress(item)}
    />
  ), [handleCardPress]);

  const renderColumn = useCallback(({ item: column }) => (
    <View style={[styles.column, { width: isTablet ? '25%' : '100%' }]}>
      {renderColumnHeader(column)}

      {column.count === 0 ? (
        <GlassmorphicEmptyState
          icon="layers-outline"
          title="Sin tareas"
          message={`No hay tareas ${filterPriority !== 'todas' ? `con prioridad ${filterPriority}` : ''}`}
          fullScreen={false}
        />
      ) : (
        <FlatList
          data={column.tasks}
          renderItem={renderKanbanCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </View>
  ), [isTablet, renderColumnHeader, renderKanbanCard, filterPriority]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <AmbientOrbs intensity="medium" />

      {/* Header */}
      <GlassmorphicHeader
        title="Tablero Kanban"
        subtitle={`${totalTasks} tareas en total`}
        icon="apps-outline"
        showGradient={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <Text style={[styles.filterLabel, { color: theme.text }]}>
            Filtrar por:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterButtons}
            contentContainerStyle={{ gap: 8 }}
          >
            {['todas', 'alta', 'media', 'baja'].map(priority => (
              <TouchableOpacity
                key={priority}
                onPress={() => {
                  hapticMedium();
                  setFilterPriority(priority);
                }}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      filterPriority === priority
                        ? theme.primary
                        : theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    {
                      color: filterPriority === priority ? '#fff' : theme.text,
                    },
                  ]}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Kanban Board */}
        {isTablet ? (
          // Horizontal scroll for tablets
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.boardContainer}
            contentContainerStyle={styles.boardContent}
          >
            <FlatList
              data={kanbanData}
              renderItem={renderColumn}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              numColumns={4}
            />
          </ScrollView>
        ) : (
          // Vertical scroll for mobile
          <FlatList
            data={kanbanData}
            renderItem={renderColumn}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* FAB - Add Task */}
      <TouchableOpacity
        onPress={() => {
          hapticMedium();
          navigation.navigate('TaskDetail', {});
        }}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  filterBar: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterButtons: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  boardContainer: {
    marginHorizontal: -16,
  },
  boardContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  column: {
    paddingHorizontal: 8,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default KanbanBoardScreen;
