// components/SyncIndicator.js
// Indicador de sincronización offline
import React, { useEffect, useState, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeSyncStatus, syncQueue, getPendingCount } from '../services/offlineQueue';
import { hapticLight } from '../utils/haptics';

const SyncIndicator = () => {
  const { theme } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    // Cargar conteo inicial
    loadPendingCount();

    // Suscribirse a cambios
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncing(status.syncing || false);
      setPendingCount(status.pendingCount || 0);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (syncing) {
      // Animación de pulso mientras sincroniza
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      pulseAnim.setValue(1);
    }
    return () => { if (pulseLoopRef.current) pulseLoopRef.current.stop(); };
  }, [syncing, pulseAnim]);

  const loadPendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  const handlePress = () => {
    hapticLight();
    if (!syncing && pendingCount > 0) {
      syncQueue(true); // Forzar sincronización
    }
  };

  if (pendingCount === 0 && !syncing) {
    return null; // No mostrar nada si no hay operaciones pendientes
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: syncing ? theme.warning : theme.error }]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={syncing}
    >
      <Animated.View style={[styles.content, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons
          name={syncing ? 'sync' : 'cloud-upload'}
          size={16}
          color="#FFF"
          style={syncing && styles.spinning}
        />
        <Text style={styles.text}>
          {syncing ? 'Sincronizando...' : `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SyncIndicator;
