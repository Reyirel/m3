/**
 * GlassmorphicEmptyState.js
 * Empty state component with glassmorphism styling
 * Displays when there's no data to show
 * 
 * Usage:
 * <GlassmorphicEmptyState
 *   icon="inbox"
 *   title="No Tasks"
 *   message="Create your first task to get started"
 *   action={{ label: "Create Task", onPress: () => {} }}
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
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import GlassmorphicButton from './GlassmorphicButton';

const GlassmorphicEmptyState = ({
  icon = 'inbox',
  iconColor,
  title = 'No Data',
  message = 'Nothing to display here',
  action,
  fullScreen = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const iconColorResolved = iconColor || theme.primary;

  const webGlassStyle = Platform.OS === 'web' ? {
    backdropFilter: isDark ? 'blur(20px) saturate(160%)' : 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: isDark ? 'blur(20px) saturate(160%)' : 'blur(16px) saturate(140%)',
  } : {};

  const content = (
    <View
      style={[
        styles.content,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
          borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
          shadowColor: theme.primary,
          ...webGlassStyle,
        },
        style,
      ]}
    >
      {/* Blur effect — native only */}
      {Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 50 : 45}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Top highlight stripe */}
      <View
        style={[
          styles.highlight,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.80)',
          },
        ]}
      />

      {/* Content */}
      <View style={styles.inner}>
        {/* Icon ring */}
        <View style={[styles.iconRing, { borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', shadowColor: theme.primary }]}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? `${iconColorResolved}20` : `${iconColorResolved}15` }]}>
            <Ionicons
              name={icon}
              size={44}
              color={iconColorResolved}
            />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>

        {/* Message */}
        <Text
          style={[styles.message, { color: theme.textSecondary }]}
          numberOfLines={4}
        >
          {message}
        </Text>

        {/* Action Button */}
        {action && (
          <View style={styles.actionContainer}>
            <GlassmorphicButton
              onPress={action.onPress}
              variant={action.variant || 'primary'}
              size="medium"
              icon={action.icon}
              style={{ minWidth: 140, borderRadius: 99 }}
            >
              {action.label}
            </GlassmorphicButton>
          </View>
        )}
      </View>

      {/* Rim glow */}
      <View
        style={[
          styles.rim,
          {
            borderColor: isDark ? theme.glassBorderSubtle : 'rgba(0,0,0,0.05)',
          },
        ]}
      />
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        {/* Backdrop */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDark
                ? 'rgba(0,0,0,0.2)'
                : 'rgba(255,255,255,0.4)',
            },
          ]}
        />

        {/* Centered content */}
        <View style={styles.fullScreenCenter}>
          {content}
        </View>
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 280,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullScreenCenter: {
    width: '100%',
    maxWidth: 400,
  },
  inner: {
    alignItems: 'center',
    zIndex: 2,
    gap: 12,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
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
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicEmptyState;
