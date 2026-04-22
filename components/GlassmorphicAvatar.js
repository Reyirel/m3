/**
 * GlassmorphicAvatar.js
 * Glassmorphic avatar component with initials/image support
 * 
 * Usage:
 * <GlassmorphicAvatar
 *   name="John Doe"
 *   image={require('./avatar.jpg')}
 *   size="large"
 *   color="#3b82f6"
 * />
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicAvatar = ({
  name,
  image,
  initials,
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  color,
  onPress,
  status, // 'online', 'offline', 'away', 'busy'
  icon,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const sizeConfig = {
    small: { size: 32, fontSize: 10, iconSize: 12, statusDotSize: 6 },
    medium: { size: 48, fontSize: 12, iconSize: 14, statusDotSize: 8 },
    large: { size: 64, fontSize: 14, iconSize: 16, statusDotSize: 10 },
    xlarge: { size: 96, fontSize: 18, iconSize: 20, statusDotSize: 12 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const bgColor = color || theme.primary;

  // Generate initials from name
  const getInitials = () => {
    if (initials) return initials;
    if (name) {
      return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '?';
  };

  const statusConfig = {
    online: { color: '#10b981', icon: 'checkmark-circle' },
    offline: { color: '#6b7280', icon: 'close-circle' },
    away: { color: '#f59e0b', icon: 'alert-circle' },
    busy: { color: '#ef4444', icon: 'close-circle' },
  };

  const statusColor = statusConfig[status]?.color || null;

  const content = (
    <View
      style={[
        styles.container,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: isDark
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(255,255,255,0.4)',
          borderColor: isDark
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.6)',
        },
        style,
      ]}
    >
      <BlurView intensity={70} style={styles.blurContent}>
        {/* Image or Initials */}
        {image ? (
          <Image
            source={image}
            style={[
              styles.image,
              {
                width: config.size,
                height: config.size,
                borderRadius: config.size / 2,
              },
            ]}
          />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={config.iconSize}
            color={bgColor}
          />
        ) : (
          <Text
            style={[
              styles.initialsText,
              {
                fontSize: config.fontSize,
                color: '#fff',
              },
            ]}
          >
            {getInitials()}
          </Text>
        )}

        {/* Background color overlay */}
        <View
          style={[
            styles.colorOverlay,
            {
              backgroundColor: `${bgColor}60`,
              borderRadius: config.size / 2,
            },
          ]}
        />

        {/* Highlight stripe */}
        <View
          style={[
            styles.highlightStripe,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.6)',
              borderRadius: config.size / 2,
            },
          ]}
        />
      </BlurView>

      {/* Rim glow */}
      <View
        style={[
          styles.rimGlow,
          {
            borderColor: `${bgColor}40`,
            borderRadius: config.size / 2,
          },
        ]}
      />

      {/* Status indicator */}
      {status && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: config.statusDotSize,
              height: config.statusDotSize,
              borderRadius: config.statusDotSize / 2,
              backgroundColor: statusColor,
              borderWidth: 2,
              borderColor: isDark ? '#1f2937' : '#fff',
              right: -4,
              bottom: -4,
            },
          ]}
        />
      )}
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
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
  },
  blurContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    position: 'absolute',
    zIndex: 2,
  },
  initialsText: {
    fontWeight: '700',
    zIndex: 2,
  },
  colorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  highlightStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    zIndex: 1,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    zIndex: 1,
  },
  statusIndicator: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default GlassmorphicAvatar;
