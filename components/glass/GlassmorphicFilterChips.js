/**
 * GlassmorphicFilterChips.js
 * Componente para filtros tipo chips con glassmorphism
 * 
 * Usage:
 * <GlassmorphicFilterChips
 *   items={[{id: 1, label: 'High', icon: 'alert'}, ...]}
 *   selectedIds={['high']}
 *   onSelectChange={setSelected}
 *   variant="filter" // or "sort"
 * />
 */

import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicFilterChips = ({
  items = [],
  selectedIds = [],
  onSelectChange,
  variant = 'filter', // 'filter', 'sort', 'view'
  horizontal = true,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const handleSelect = (itemId) => {
    const newSelected = selectedIds.includes(itemId)
      ? selectedIds.filter((id) => id !== itemId)
      : [...selectedIds, itemId];
    onSelectChange?.(newSelected);
  };

  const variantConfig = {
    filter: {
      height: 32,
      fontSize: 12,
      iconSize: 14,
      gap: 8,
      borderRadius: 16,
    },
    sort: {
      height: 36,
      fontSize: 13,
      iconSize: 16,
      gap: 10,
      borderRadius: 8,
    },
    view: {
      height: 40,
      fontSize: 14,
      iconSize: 18,
      gap: 12,
      borderRadius: 12,
    },
  };

  const config = variantConfig[variant] || variantConfig.filter;

  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      style={[styles.container, style]}
      contentContainerStyle={[styles.contentContainer, { gap: config.gap }]}
    >
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleSelect(item.id)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                height: config.height,
                borderRadius: config.borderRadius,
                backgroundColor: isSelected
                  ? theme.primary
                  : isDark
                    ? 'rgba(0,0,0,0.3)'
                    : 'rgba(255,255,255,0.4)',
                borderColor: isSelected
                  ? theme.primary
                  : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(255,255,255,0.6)',
              },
            ]}
          >
            <BlurView
              intensity={isSelected ? 0 : 70}
              style={[
                styles.blurContent,
                { gap: item.icon ? 6 : 0 },
              ]}
            >
              {item.icon && (
                <Ionicons
                  name={item.icon}
                  size={config.iconSize}
                  color={isSelected ? '#fff' : theme.textSecondary}
                />
              )}
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: config.fontSize,
                    color: isSelected ? '#fff' : theme.text,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </BlurView>

            {/* Rim glow when selected */}
            {isSelected && (
              <View
                style={[
                  styles.rimGlow,
                  {
                    borderRadius: config.borderRadius,
                    borderColor: `${theme.primary}40`,
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  blurContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '500',
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
});

export default GlassmorphicFilterChips;
