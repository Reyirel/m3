// components/NotificationsBell.js
// Botón de notificaciones con badge - OPTIMIZADO

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadNotificationsCount } from '../services/notificationsAdvanced';
import { useTheme } from '../contexts/ThemeContext';

// Cache global para evitar recargas innecesarias
let cachedCount = 0;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minuto de cache

export default function NotificationsBell({ onPress, _theme }) {
  const { theme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(cachedCount);
  const isMountedRef = useRef(true);

  const loadUnreadCount = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Usar cache si no ha expirado y no se fuerza refresh
    if (!forceRefresh && cachedCount > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      setUnreadCount(prev => prev !== cachedCount ? cachedCount : prev);
      return;
    }

    try {
      const count = await getUnreadNotificationsCount();
      cachedCount = count;
      lastFetchTime = now;

      if (isMountedRef.current) {
        setUnreadCount(count);
      }
    } catch (error) {
      // Silent fail - mantener el último conteo
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Carga inicial (usa cache si disponible)
    loadUnreadCount();
    
    // Recargar cada 60 segundos (antes era 30)
    const interval = setInterval(() => loadUnreadCount(true), 60000);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadUnreadCount]);

  const handlePress = useCallback(() => {
    onPress();
    // Refrescar en background después de abrir (solo si sigue montado)
    const t = setTimeout(() => {
      if (isMountedRef.current) loadUnreadCount(true);
    }, 1000);
    // No necesita cleanup: el isMountedRef.current ya guarda el setState
    return () => clearTimeout(t);
  }, [onPress, loadUnreadCount]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications" size={24} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Función para invalidar cache externamente (llamar después de marcar como leído)
export const invalidateNotificationCache = () => {
  lastFetchTime = 0;
  cachedCount = 0;
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
