// components/Toast.js
// Componente de Toast para feedback visual de acciones
// Versión compatible con web y mobile
import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ 
  message, 
  type = 'success', 
  visible, 
  onHide, 
  duration = 3000,
  action = null
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Disable native driver on web
  const useNativeDriver = Platform.OS !== 'web';

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: useNativeDriver
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: useNativeDriver
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  }, [translateY, opacity, useNativeDriver, onHide]);

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: useNativeDriver,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: useNativeDriver
        })
      ]).start();

      // Hide automatically after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, hideToast, opacity, translateY, useNativeDriver]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return '#34C759';
      case 'error': return '#FF3B30';
      case 'warning': return '#FF9500';
      case 'info': return '#5856D6';
      default: return '#34C759';
    }
  };

  const accentColor = getColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: 'rgba(18, 10, 15, 0.92)',
          borderColor: accentColor + '55',
          borderLeftColor: accentColor,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
        }
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: accentColor + '22' }]}>
        <Ionicons name={getIcon()} size={20} color={accentColor} />
      </View>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>

      {action && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: accentColor + '25', borderColor: accentColor + '60' }]}
          onPress={() => {
            action.onPress();
            hideToast();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: accentColor }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 9999,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  }
});

export default Toast;
