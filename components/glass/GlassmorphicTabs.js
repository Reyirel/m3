/**
 * GlassmorphicTabs.js
 * Glassmorphic tab/segmented control component
 * 
 * Usage:
 * <GlassmorphicTabs
 *   tabs={[
 *     { id: 'all', label: 'All', icon: 'list' },
 *     { id: 'active', label: 'Active', icon: 'play-circle' },
 *     { id: 'completed', label: 'Completed', icon: 'checkmark-circle' },
 *   ]}
 *   activeTab="all"
 *   onChange={(tabId) => {}}
 * />
 */

import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicTabs = ({
  tabs = [],
  activeTab,
  onChange,
  scrollable = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef(null);

  const handleTabPress = (tabId) => {
    onChange?.(tabId);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)',
          borderColor: theme.glassBorder,
        },
        style,
      ]}
    >
      {/* Blur effect */}
      {Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 50 : 45}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Background overlay */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
          },
        ]}
      />

      {/* Top highlight stripe */}
      <View
        style={[
          styles.highlight,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
          },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
              style={[
                styles.tab,
                isActive && [
                  styles.tabActive,
                  { backgroundColor: theme.primary },
                ],
                !isActive && [
                  styles.tabInactive,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.5)',
                  },
                ],
              ]}
            >
              {tab.icon && (
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : theme.textSecondary}
                  style={styles.tabIcon}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  !isActive && { color: theme.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rim glow */}
      <View
        style={[
          styles.rim,
          {
            borderColor: theme.glassBorderSubtle,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    gap: 6,
    zIndex: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabInactive: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabIcon: {
    marginRight: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    borderRadius: 1,
    zIndex: 1,
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicTabs;
