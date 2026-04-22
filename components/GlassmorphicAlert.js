/**
 * GlassmorphicAlert.js
 * Glassmorphic alert banner component
 * Displays alerts/warnings/info messages with glassmorphism styling
 * 
 * Usage:
 * <GlassmorphicAlert
 *   type="success" // 'success', 'error', 'warning', 'info'
 *   title="Operation Successful"
 *   message="Your changes have been saved"
 *   icon="checkmark-circle"
 *   onClose={() => {}}
 *   dismissible={true}
 * />
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicAlert = ({
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  icon,
  onClose,
  dismissible = true,
  duration = 0, // 0 = infinite, > 0 = dismiss after ms
  style,
}) => {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const typeConfig = {
    success: {
      icon: icon || 'checkmark-circle',
      color: theme.success,
      bgColor: theme.successAlpha || theme.success + '15',
    },
    error: {
      icon: icon || 'close-circle',
      color: theme.error,
      bgColor: theme.errorAlpha || theme.error + '15',
    },
    warning: {
      icon: icon || 'warning',
      color: theme.warning,
      bgColor: theme.warningAlpha || theme.warning + '15',
    },
    info: {
      icon: icon || 'information-circle',
      color: theme.info,
      bgColor: theme.infoAlpha || theme.info + '15',
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [slideAnim, opacityAnim, scaleAnim, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
            { scale: scaleAnim },
          ],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.alert,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)',
            borderColor: theme.glassBorder,
          },
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

        {/* Gradient background overlay */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: config.bgColor,
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
          {/* Icon */}
          <Ionicons
            name={config.icon}
            size={24}
            color={config.color}
            style={styles.icon}
          />

          {/* Text content */}
          <View style={styles.textContainer}>
            {title && (
              <Text style={[styles.title, { color: theme.text }]}>
                {title}
              </Text>
            )}
            {message && (
              <Text
                style={[
                  styles.message,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={3}
              >
                {message}
              </Text>
            )}
          </View>

          {/* Close button */}
          {dismissible && (
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 2,
    gap: 12,
  },
  icon: {
    marginRight: 4,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicAlert;
