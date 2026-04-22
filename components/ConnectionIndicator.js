import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue } from 'firebase/database';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../contexts/ThemeContext';

export default function ConnectionIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(connected);

      // Show indicator when offline, hide when online after 3 seconds
      if (!connected) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setShowIndicator(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
      } else {
        hideTimerRef.current = setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }).start(() => {
            setShowIndicator(false);
          });
        }, 3000);
      }
    });

    // Monitor Firebase Realtime Database connectivity
    try {
      const db = getDatabase();
      const connectedRef = ref(db, '.info/connected');
      
      const unsubscribeFirebase = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // Connected to Firebase
        } else {
          // Not connected to Firebase
        }
      });

      return () => {
        unsubscribeNetInfo();
        unsubscribeFirebase();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    } catch (error) {
      return () => {
        unsubscribeNetInfo();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
  }, [fadeAnim]);

  if (!showIndicator) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: isOnline ? theme.success || '#28a745' : theme.error || '#dc3545',
          opacity: fadeAnim 
        }
      ]}
    >
      <View style={styles.content}>
        <Ionicons 
          name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'} 
          size={16} 
          color="#FFFFFF" 
        />
        <Text style={styles.text}>
          {isOnline ? 'Conectado' : 'Sin conexión - Trabajando offline'}
        </Text>
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
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  }
});
