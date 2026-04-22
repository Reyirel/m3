/**
 * GlassmorphicListItem.js
 * Componente flexible para items de listas
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

const GlassmorphicListItem = ({
  title,
  subtitle,
  icon,
  rightText,
  rightIcon,
  onPress,
  onLongPress,
  disabled = false,
  selected = false,
  color,
  action = null, // { icon, onPress, color }
  badge = null, // { text, color }
  style,
}) => {
  const { theme, isDark } = useTheme();

  const itemColor = color || theme.primary;

  const styles = useMemo(
    () => createStyles(theme, isDark, itemColor),
    [theme, isDark, itemColor]
  );

  const itemStyle = [
    styles.container,
    selected && styles.containerSelected,
    disabled && styles.containerDisabled,
    style,
  ];

  const content = (
    <View style={itemStyle}>
      {Platform.OS === 'web' ? (
        <View style={styles.backdrop} />
      ) : (
        <BlurView intensity={75} style={styles.backdrop} />
      )}

      {/* Icon */}
      {icon && (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: selected
                ? itemColor
                : theme.primaryAlpha,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={selected ? '#fff' : itemColor}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: disabled ? theme.textMuted : theme.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Badge */}
      {badge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: badge.color || theme.warning },
          ]}
        >
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      )}

      {/* Right Text or Icon */}
      {rightText ? (
        <Text
          style={[
            styles.rightText,
            { color: disabled ? theme.border : theme.textMuted },
          ]}
        >
          {rightText}
        </Text>
      ) : rightIcon ? (
        <Ionicons
          name={rightIcon}
          size={20}
          color={disabled ? theme.border : theme.textMuted}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={disabled ? theme.border : theme.textMuted}
        />
      )}

      {/* Action Button */}
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={action.onPress}
          disabled={disabled}
        >
          <Ionicons
            name={action.icon}
            size={18}
            color={action.color || theme.primary}
          />
        </TouchableOpacity>
      )}

      {/* Highlight & Glow */}
      <View style={styles.highlight} />
      <View
        style={[
          styles.rimGlow,
          {
            borderColor: selected ? itemColor : theme.glassBorderStrong,
          },
        ]}
      />
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      {content}
    </TouchableOpacity>
  );
};

const createStyles = (theme, isDark, itemColor) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      gap: 10,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      position: 'relative',
    },
    containerSelected: {
      backgroundColor: itemColor,
    },
    containerDisabled: {
      opacity: 0.5,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
    },
    subtitle: {
      fontSize: 12,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    rightText: {
      fontSize: 13,
      fontWeight: '600',
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
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
      borderRadius: 14,
    },
    rimGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderRadius: 14,
      pointerEvents: 'none',
    },
  });

export default GlassmorphicListItem;
