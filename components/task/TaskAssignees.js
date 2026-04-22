/**
 * TaskAssignees.js - Selector de asignados + auto-assignment áreas
 * 
 * Gestiona usuarios y coordinadores de áreas
 * Incluye lógica de auto-assign inteligente
 */

import React from 'react';
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
import Avatar from '../Avatar';
import AreaSelector from '../AreaSelector';

export default function TaskAssignees({
  selectedAssignees = [],
  onAssigneesChange = () => {},
  selectedAreas = [],
  onAreasChange = () => {},
  users = [],
  areas = [],
  isReadOnly = false,
}) {
  const { theme, isDark } = useTheme();
  const [showUserSelector, setShowUserSelector] = React.useState(false);
  const [showAreaSelector, setShowAreaSelector] = React.useState(false);

  // Auto-assign coordinators when areas change
  React.useEffect(() => {
    if (selectedAreas.length > 0) {
      const coordinators = selectedAreas
        .map((areaId) => {
          const area = areas.find((a) => a.id === areaId);
          return area?.coordinatorId;
        })
        .filter(Boolean);

      // Add new coordinators without removing existing assignees
      const newAssignees = Array.from(
        new Set([...selectedAssignees, ...coordinators])
      );
      
      if (newAssignees.length !== selectedAssignees.length) {
        onAssigneesChange(newAssignees);
      }
    }
  }, [selectedAreas]);

  const removeAssignee = (userId) => {
    onAssigneesChange(selectedAssignees.filter((id) => id !== userId));
  };

  const removeArea = (areaId) => {
    onAreasChange(selectedAreas.filter((id) => id !== areaId));
  };

  const getAssigneeInfo = (userId) => {
    return users.find((u) => u.id === userId);
  };

  const getAreaInfo = (areaId) => {
    return areas.find((a) => a.id === areaId);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Coordinación
      </Text>

      <GlassCard style={{ gap: 16 }}>
        {/* ASIGNADOS */}
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Asignados
            </Text>
            {!isReadOnly && (
              <TouchableOpacity
                onPress={() => setShowUserSelector(!showUserSelector)}
                accessible={true}
                accessibilityLabel="Agregar asignado"
                accessibilityHint="Presiona para agregar usuarios a esta tarea"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedAssignees.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Sin asignados
            </Text>
          ) : (
            <View style={styles.assigneesList}>
              {selectedAssignees.map((userId) => {
                const user = getAssigneeInfo(userId);
                return user ? (
                  <View
                    key={userId}
                    style={[
                      styles.assigneeItem,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel={`Asignado: ${user.name}`}
                    accessibilityHint="Desliza para eliminar"
                    accessibilityRole="button"
                  >
                    <Avatar
                      name={user.name}
                      photoURL={user.photoURL}
                      size={32}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assignName, { color: theme.text }]}>
                        {user.name}
                      </Text>
                      {user.role && (
                        <Text style={[styles.assignRole, { color: theme.textMuted }]}>
                          {user.role}
                        </Text>
                      )}
                    </View>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => removeAssignee(userId)}
                        accessible={true}
                        accessibilityLabel={`Remover a ${user.name}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        {/* ÁREAS */}
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: theme.text }]}>Áreas</Text>
            {!isReadOnly && (
              <TouchableOpacity
                onPress={() => setShowAreaSelector(!showAreaSelector)}
                accessible={true}
                accessibilityLabel="Agregar área"
                accessibilityHint="Presiona para agregar áreas a esta tarea"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedAreas.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Sin áreas
            </Text>
          ) : (
            <View style={styles.areasList}>
              {selectedAreas.map((areaId) => {
                const area = getAreaInfo(areaId);
                return area ? (
                  <View
                    key={areaId}
                    style={[
                      styles.areaItem,
                      { backgroundColor: isDark ? theme.glass : theme.glassStrong },
                    ]}
                    accessible={true}
                    accessibilityLabel={`Área: ${area.name}`}
                    accessibilityHint="Desliza para eliminar"
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.areaColor,
                        { backgroundColor: area.color || theme.primary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.areaName, { color: theme.text }]}>
                        {area.name}
                      </Text>
                      {area.coordinatorId && (
                        <Text style={[styles.areaCoord, { color: theme.textMuted }]}>
                          Coordinador: {getAssigneeInfo(area.coordinatorId)?.name}
                        </Text>
                      )}
                    </View>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => removeArea(areaId)}
                        accessible={true}
                        accessibilityLabel={`Remover área ${area.name}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        {/* HINT DE AUTO-ASSIGN */}
        {selectedAreas.length > 0 && (
          <View style={[styles.hint, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
            <Text style={[styles.hintText, { color: theme.primary }]}>
              Los coordinadores se asignan automáticamente
            </Text>
          </View>
        )}
      </GlassCard>

      {/* AREA SELECTOR MODAL (simple list) */}
      {showAreaSelector && !isReadOnly && (
        <View style={[styles.selectorModal, { backgroundColor: theme.card }]}>
          <View style={[styles.selectorHeader, { borderBottomColor: theme.glassBorder }]}>
            <Text style={[styles.selectorTitle, { color: theme.text }]}>
              Seleccionar Áreas
            </Text>
            <TouchableOpacity onPress={() => setShowAreaSelector(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={areas.filter((a) => !selectedAreas.includes(a.id))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onAreasChange([...selectedAreas, item.id]);
                  setShowAreaSelector(false);
                }}
                style={[styles.selectorItem, { borderBottomColor: theme.glassBorder }]}
              >
                <View
                  style={[
                    styles.areaColor,
                    { backgroundColor: item.color || theme.primary },
                  ]}
                />
                <Text style={[styles.selectorItemText, { color: theme.text }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
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
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  assigneesList: {
    gap: 8,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  assignName: {
    fontSize: 13,
    fontWeight: '600',
  },
  assignRole: {
    fontSize: 11,
  },
  areasList: {
    gap: 8,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  areaColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
  },
  areaCoord: {
    fontSize: 11,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  selectorModal: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 300,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
