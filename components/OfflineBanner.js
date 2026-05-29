// components/OfflineBanner.js
import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../contexts/TasksContext';

export default function OfflineBanner() {
  const { isOnline } = useTasks();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOnline]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>Sin conexión — cambios guardados localmente</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#636366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { position: 'fixed' },
    }),
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
