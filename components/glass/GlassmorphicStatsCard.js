/**
 * GlassmorphicStatsCard.js
 * Card especializada para mostrar estadísticas con glassmorphism
 * 
 * Usage:
 * <GlassmorphicStatsCard
 *   icon="stats-chart"
 *   title="Total Tasks"
 *   value={42}
 *   change={+5}
 *   color="#3b82f6"
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicStatsCard = ({
  icon,
  title,
  value,
  change,
  color,
  onPress,
  compact = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const cardColor = color || theme.primary;
  const isPositive = change >= 0;

  const cardStyle = compact 
    ? { paddingHorizontal: 12, paddingVertical: 10, minWidth: 100 }
    : { paddingHorizontal: 16, paddingVertical: 14, minWidth: 140 };

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(255,255,255,0.4)',
          borderColor: isDark
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.6)',
          ...cardStyle,
        },
        style,
      ]}
    >
      <BlurView intensity={70} style={styles.blurContent}>
        {/* Header */}
        <View style={styles.header}>
          {icon && (
            <Ionicons
              name={icon}
              size={compact ? 14 : 16}
              color={cardColor}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.title,
              {
                color: theme.textSecondary,
                fontSize: compact ? 10 : 12,
              },
            ]}
          >
            {title}
          </Text>
        </View>

        {/* Value */}
        <Text
          style={[
            styles.value,
            {
              color: theme.text,
              fontSize: compact ? 18 : 24,
            },
          ]}
        >
          {value}
        </Text>

        {/* Change indicator */}
        {change !== undefined && (
          <View style={styles.changeContainer}>
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={compact ? 10 : 12}
              color={isPositive ? '#10b981' : '#ef4444'}
            />
            <Text
              style={[
                styles.changeText,
                {
                  color: isPositive ? '#10b981' : '#ef4444',
                  fontSize: compact ? 9 : 11,
                },
              ]}
            >
              {isPositive ? '+' : ''}{change}
            </Text>
          </View>
        )}

        {/* Highlight stripe */}
        <View
          style={[
            styles.highlightStripe,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.6)',
            },
          ]}
        />
      </BlurView>

      {/* Rim glow */}
      <View
        style={[
          styles.rimGlow,
          {
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.3)',
          },
        ]}
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blurContent: {
    flexDirection: 'column',
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    marginRight: 2,
  },
  title: {
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontWeight: '700',
    marginVertical: 2,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontWeight: '600',
  },
  highlightStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicStatsCard;
