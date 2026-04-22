/**
 * GlassmorphicHeader.js
 * Reusable glassmorphic header for screens
 * 
 * Usage:
 * <GlassmorphicHeader
 *   title="Tasks"
 *   subtitle="Manage your work"
 *   icon="list"
 *   actions={[
 *     { icon: 'settings', onPress: () => {} },
 *     { icon: 'menu', onPress: () => {} },
 *   ]}
 *   showGradient={true}
 * />
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicHeader = ({
  title,
  subtitle,
  icon,
  actions = [],
  onBackPress,
  showGradient = true,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const webGlassStyle = Platform.OS === 'web' ? {
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  } : {};

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(0,0,0,0.90)' : 'rgba(242,242,247,0.94)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          shadowColor: '#000000',
          ...webGlassStyle,
        },
        style,
      ]}
    >
      {/* Blur effect — native */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={isDark ? 80 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Left content */}
        <View style={styles.leftContent}>
          {onBackPress && (
            <TouchableOpacity
              onPress={onBackPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.backButton, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              }]}
            >
              <Ionicons name="chevron-back" size={22} color={theme.primary} />
            </TouchableOpacity>
          )}

          {icon && !onBackPress && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.primary + '20' },
              ]}
            >
              <Ionicons
                name={icon}
                size={20}
                color={theme.primary}
              />
            </View>
          )}

          <View style={styles.textContent}>
            <Text style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                disabled={action.disabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                  action.disabled && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.color || theme.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Top highlight stripe */}
      <View
        style={[
          styles.highlight,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
          },
        ]}
      />

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
    borderBottomWidth: 0.5,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
    zIndex: 1,
  },
  rim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
});

export default GlassmorphicHeader;
