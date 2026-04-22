/**
 * PremiumNotificationCenter.js
 * Centro de notificaciones premium con glassmorphism y animations
 * Maneja notificaciones globales en la app
 */

import React, { useState, useCallback } from 'react';
import { Text, View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

// Context para notificaciones globales
export const NotificationContext = React.createContext();

export function PremiumNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback(
    (message, type = 'info', duration = 3000, icon = null) => {
      const id = Date.now();
      const anim = new Animated.Value(0);

      // Animate in
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      setNotifications((prev) => [
        ...prev,
        { id, message, type, anim, icon },
      ]);

      // Auto remove
      if (duration > 0) {
        setTimeout(() => {
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          });
        }, duration);
      }

      return id;
    },
    []
  );

  const hideNotification = useCallback((id) => {
    setNotifications((prev) => {
      const notif = prev.find((n) => n.id === id);
      if (notif) {
        Animated.timing(notif.anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setNotifications((p) => p.filter((n) => n.id !== id));
        });
      }
      return prev;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <PremiumNotificationDisplay notifications={notifications} />
    </NotificationContext.Provider>
  );
}

function PremiumNotificationDisplay({ notifications }) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      {notifications.map((notif) => (
        <PremiumNotificationItem key={notif.id} notif={notif} />
      ))}
    </View>
  );
}

function PremiumNotificationItem({ notif }) {
  const { theme, isDark } = useTheme();

  const typeConfig = {
    success: {
      gradient: ['#10B981', '#059669'],
      icon: 'checkmark-circle',
      glow: '#10B981',
    },
    warning: {
      gradient: ['#F59E0B', '#D97706'],
      icon: 'alert-circle',
      glow: '#F59E0B',
    },
    error: {
      gradient: ['#EF4444', '#DC2626'],
      icon: 'close-circle',
      glow: '#EF4444',
    },
    info: {
      gradient: ['#3B82F6', '#2563EB'],
      icon: 'information-circle',
      glow: '#3B82F6',
    },
  };

  const config = typeConfig[notif.type] || typeConfig.info;
  const opacity = notif.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const translateY = notif.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Glow background */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: config.glow,
          opacity: 0.1,
          borderRadius: 12,
        }}
      />

      <BlurView intensity={60} tint={isDark ? 'dark' : 'light'}>
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Rim glow */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 1,
              borderRadius: 12,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          />

          <View style={styles.content}>
            <Ionicons
              name={notif.icon || config.icon}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.message}>{notif.message}</Text>
          </View>

          {/* Shine effect - handled by LinearGradient colors */}
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within PremiumNotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  notification: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    pointerEvents: 'auto',
  },
  gradient: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
});
