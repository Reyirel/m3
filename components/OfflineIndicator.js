// components/OfflineIndicator.js
// Indicador visual de estado de conexión y sincronización
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  subscribeToConnectionState,
  getPendingCount,
  syncPendingOperations
} from '../services/offlineSync';
import { useTheme } from '../contexts/ThemeContext';

export default function OfflineIndicator({ _theme = {}, style = {} }) {
  const { theme } = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    // Suscribirse a cambios de conexión
    const unsubscribe = subscribeToConnectionState(async (online) => {
      setIsOnline(online);
      
      // Actualizar contador de pendientes
      const count = await getPendingCount();
      setPendingCount(count);
      
      // Mostrar/ocultar banner
      if (!online || count > 0) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true
        }).start(() => setShowBanner(false));
      }
    });

    // Animación de pulso para sincronización
    if (isSyncing) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      pulseAnim.setValue(1);
    }

    return () => {
      unsubscribe();
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [isSyncing, pulseAnim, slideAnim]);

  // Actualizar pendientes periódicamente
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncPendingOperations();
      setPendingCount(result.pending);
    } catch (error) {
      if (__DEV__) console.error('Error sincronizando:', error);
    }
    setIsSyncing(false);
  };

  if (!showBanner) return null;

  const backgroundColor = isOnline
    ? (pendingCount > 0 ? theme.warning : theme.success)
    : theme.error;

  const statusText = !isOnline 
    ? 'Sin conexión'
    : pendingCount > 0 
      ? `${pendingCount} cambios pendientes`
      : 'Conectado';

  const statusIcon = !isOnline 
    ? 'cloud-offline'
    : pendingCount > 0 
      ? 'cloud-upload'
      : 'cloud-done';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor, transform: [{ translateY: slideAnim }] },
        style
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: isSyncing ? pulseAnim : 1 }] }}>
          <Ionicons 
            name={isSyncing ? 'sync' : statusIcon} 
            size={18} 
            color="#FFFFFF" 
          />
        </Animated.View>
        
        <Text style={styles.text}>
          {isSyncing ? 'Sincronizando...' : statusText}
        </Text>
        
        {isOnline && pendingCount > 0 && !isSyncing && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={handleSync}
          >
            <Text style={styles.syncButtonText}>Sincronizar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40, // Para status bar
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
