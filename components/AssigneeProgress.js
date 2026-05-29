// components/AssigneeProgress.js
// Muestra el progreso de confirmación individual por cada asignado

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const AssigneeProgress = ({
  assignees = [], // [{email, displayName, completed, completedAt}]
  currentUserEmail = null,
  onConfirm = null, // Callback cuando el usuario confirma su parte
  onRemoveConfirmation = null, // Callback para admin quitar confirmación
  isAdmin = false,
  compact = false
}) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const confirmedCount = assignees.filter(a => a.completed).length;
  const totalCount = assignees.length;
  const progress = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;
  
  const currentUserAssignee = assignees.find(
    a => a.email.toLowerCase() === currentUserEmail?.toLowerCase()
  );
  const currentUserCompleted = currentUserAssignee?.completed || false;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (totalCount === 0) return null;
  
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactProgressBar}>
          <View style={[styles.compactProgressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.compactText}>
          {confirmedCount}/{totalCount} confirmaron
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="people" size={18} color={theme.secondary} />
          <Text style={[styles.title, { color: theme.text }]}>Confirmaciones por asignado</Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: theme.infoAlpha }]}>
          <Text style={[styles.progressText, { color: theme.secondary }]}>{confirmedCount}/{totalCount}</Text>
        </View>
      </View>
      
      {/* Barra de progreso */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progress}%` },
              progress === 100 && styles.progressComplete
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
      </View>
      
      {/* Lista de asignados */}
      <View style={styles.assigneesList}>
        {assignees.map((assignee, _index) => (
          <View 
            key={assignee.email} 
            style={[
              styles.assigneeItem,
              assignee.completed && styles.assigneeItemCompleted,
              assignee.email.toLowerCase() === currentUserEmail?.toLowerCase() && styles.assigneeItemCurrent
            ]}
          >
            <View style={styles.assigneeInfo}>
              <View style={[
                styles.statusIcon,
                assignee.completed ? styles.statusCompleted : styles.statusPending
              ]}>
                <Ionicons
                  name={assignee.completed ? "checkmark" : "time-outline"}
                  size={14}
                  color={assignee.completed ? '#FFF' : theme.textMuted}
                />
              </View>
              <View style={styles.assigneeTextContainer}>
                <Text style={[
                  styles.assigneeName,
                  { color: theme.text },
                  assignee.completed && { color: theme.success }
                ]}>
                  {assignee.displayName}
                  {assignee.email.toLowerCase() === currentUserEmail?.toLowerCase() && (
                    <Text style={[styles.youLabel, { color: theme.secondary }]}> (Tú)</Text>
                  )}
                </Text>
                {assignee.completed && assignee.completedAt && (
                  <Text style={styles.completedAt}>
                    Confirmó: {formatDate(assignee.completedAt)}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Botón para admin quitar confirmación */}
            {isAdmin && assignee.completed && onRemoveConfirmation && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => onRemoveConfirmation(assignee.email)}
              >
                <Ionicons name="close-circle" size={20} color={theme.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      
      {/* Botón para que el usuario actual confirme */}
      {currentUserEmail && currentUserAssignee && !currentUserCompleted && onConfirm && (
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: theme.primary }]}
          onPress={onConfirm}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFF" />
          <Text style={styles.confirmButtonText}>Confirmar mi parte completada</Text>
        </TouchableOpacity>
      )}

      {currentUserCompleted && (
        <View style={[styles.confirmedBanner, { backgroundColor: theme.successAlpha, borderColor: theme.success }]}>
          <Ionicons name="checkmark-done" size={20} color={theme.success} />
          <Text style={[styles.confirmedBannerText, { color: theme.success }]}>Ya confirmaste tu parte</Text>
        </View>
      )}
      
      {progress === 100 && (
        <View style={[styles.allCompleteBanner, { backgroundColor: theme.warningAlpha, borderColor: theme.warning }]}>
          <Ionicons name="trophy" size={20} color={theme.warning} />
          <Text style={[styles.allCompleteBannerText, { color: theme.warning }]}>
            Todos han confirmado - Listo para revisión del admin
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  progressBadge: {
    backgroundColor: theme.infoAlpha,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.secondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.secondary,
    borderRadius: 4,
  },
  progressComplete: {
    backgroundColor: theme.success,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  assigneesList: {
    gap: 8,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  assigneeItemCompleted: {
    backgroundColor: theme.successAlpha,
    borderColor: theme.success,
  },
  assigneeItemCurrent: {
    borderWidth: 2,
    borderColor: theme.secondary,
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  statusIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: theme.success,
  },
  statusPending: {
    backgroundColor: theme.border,
  },
  assigneeTextContainer: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  assigneeNameCompleted: {
    color: theme.success,
  },
  youLabel: {
    color: theme.secondary,
    fontWeight: '700',
  },
  completedAt: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.successAlpha,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.success,
  },
  confirmedBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.success,
  },
  allCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.warningAlpha,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  allCompleteBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.warning,
    flex: 1,
    textAlign: 'center',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: theme.secondary,
    borderRadius: 3,
  },
  compactText: {
    fontSize: 12,
    color: theme.textSecondary,
    minWidth: 80,
  },
});

export default memo(AssigneeProgress);
