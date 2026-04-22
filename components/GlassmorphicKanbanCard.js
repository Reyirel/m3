/**
 * GlassmorphicKanbanCard.js
 * Tarjeta de Kanban con glasmorphism y soporte para drag-drop
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicKanbanCard = ({
  id,
  title,
  description,
  priority = 'media',
  assignee,
  dueDate,
  tags = [],
  onPress,
  onLongPress,
  disabled = false,
  isDragging = false,
  style,
}) => {
  const { theme, isDark } = useTheme();

  // Determine priority color
  const priorityColor = {
    alta: theme.error,
    media: theme.warning,
    baja: theme.success,
  }[priority] || theme.info;

  const styles = useMemo(
    () => createStyles(theme, isDark, priorityColor, isDragging),
    [theme, isDark, priorityColor, isDragging]
  );

  const isOverdue = dueDate && new Date(dueDate) < new Date();

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={[styles.container, isDragging && styles.dragging, style]}
    >
      {Platform.OS === 'web' ? (
        <View style={styles.backdrop} />
      ) : (
        <BlurView intensity={75} style={styles.backdrop} />
      )}

      {/* Priority indicator */}
      <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>

        {/* Description */}
        {description && (
          <Text
            style={[styles.description, { color: theme.textMuted }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 2).map((tag, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  { backgroundColor: theme.primaryAlpha },
                ]}
              >
                <Text style={[styles.tagText, { color: theme.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
            {tags.length > 2 && (
              <Text style={[styles.moreTag, { color: theme.textMuted }]}>
                +{tags.length - 2}
              </Text>
            )}
          </View>
        )}

        {/* Footer: Assignee + Due Date */}
        <View style={styles.footer}>
          {assignee && (
            <View style={styles.assignee}>
              <Ionicons
                name="person-circle-outline"
                size={14}
                color={theme.primary}
              />
              <Text style={[styles.assigneeText, { color: theme.textMuted }]}>
                {assignee}
              </Text>
            </View>
          )}

          {dueDate && (
            <View
              style={[
                styles.dueDate,
                isOverdue && {
                  borderColor: theme.error,
                },
              ]}
            >
              <Ionicons
                name={isOverdue ? 'alert-circle-outline' : 'calendar-outline'}
                size={12}
                color={isOverdue ? theme.error : theme.textMuted}
              />
              <Text
                style={[
                  styles.dueDateText,
                  { color: isOverdue ? theme.error : theme.textMuted },
                ]}
              >
                {new Date(dueDate).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Highlight & Glow */}
      <View style={styles.highlight} />
      <View
        style={[
          styles.rimGlow,
          {
            borderColor: isDragging
              ? priorityColor
              : theme.glassBorder,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const createStyles = (theme, isDark, priorityColor, isDragging) =>
  StyleSheet.create({
    container: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
      marginBottom: 8,
      position: 'relative',
      shadowColor: isDragging ? priorityColor : '#000',
      shadowOffset: { width: 0, height: isDragging ? 4 : 2 },
      shadowOpacity: isDragging ? 0.3 : 0.08,
      shadowRadius: isDragging ? 8 : 6,
      elevation: isDragging ? 8 : 3,
    },
    dragging: {
      opacity: 0.95,
      transform: [{ scale: 1.02 }],
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    priorityBar: {
      height: 3,
      width: '100%',
    },
    content: {
      padding: 12,
      gap: 8,
      zIndex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
    },
    description: {
      fontSize: 12,
      lineHeight: 16,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginVertical: 4,
    },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 10,
      fontWeight: '600',
    },
    moreTag: {
      fontSize: 10,
      fontWeight: '600',
      paddingHorizontal: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    assignee: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    assigneeText: {
      fontSize: 11,
      flex: 1,
    },
    dueDate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dueDateText: {
      fontSize: 10,
      fontWeight: '600',
    },
    highlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.3)',
    },
    rimGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderRadius: 12,
      pointerEvents: 'none',
    },
  });

export default GlassmorphicKanbanCard;
