/**
 * TaskFormExtended.js
 * Formulario compacto: título/desc inline, resto en triggers/modales
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import TaskFormBasic from './TaskFormBasic';
import {
  PrioritySelector,
  StatusSelector,
  AreaSelector,
  AssigneeSelector,
  DateSelector,
} from '../selectors';

export default function TaskFormExtended({
  title = '',
  onTitleChange = () => {},
  description = '',
  onDescriptionChange = () => {},
  priority = 'media',
  onPriorityChange = () => {},
  status = 'pendiente',
  onStatusChange = () => {},
  selectedAreas = [],
  onAreasChange = () => {},
  selectedAssignees = [],
  onAssigneesChange = () => {},
  dueDate = new Date(),
  onDueDateChange = () => {},
  availableUsers = [],
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Título + Descripción */}
      <TaskFormBasic
        title={title}
        onTitleChange={onTitleChange}
        description={description}
        onDescriptionChange={onDescriptionChange}
        isReadOnly={isReadOnly}
      />

      {!isReadOnly && (
        <>
          {/* Tarjeta: Prioridad + Estado */}
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}>
            <PrioritySelector value={priority} onChange={onPriorityChange} />
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />
            <StatusSelector value={status} onChange={onStatusChange} />
          </View>

          {/* Tarjeta: Fecha + Áreas + Asignados */}
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}>
            <DateSelector
              value={dueDate}
              onChange={onDueDateChange}
              label="Vencimiento"
              showTime={true}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />
            <AreaSelector
              value={selectedAreas}
              onChange={onAreasChange}
              multiple={true}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />
            <AssigneeSelector
              value={selectedAssignees}
              onChange={onAssigneesChange}
              availableUsers={availableUsers}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: 0.5 },
});
