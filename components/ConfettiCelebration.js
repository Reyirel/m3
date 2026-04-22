// components/ConfettiCelebration.js
// Componente de confetti para celebrar completar tareas - Compatible con web
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { getConfettiCannon } from '../utils/platformComponents';

const ConfettiCannon = getConfettiCannon();

export default function ConfettiCelebration({ 
  trigger, 
  count = 50, 
  _duration = 2000,
  fadeOut = true 
}) {
  const confettiRef = useRef(null);

  useEffect(() => {
    if (trigger && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        ref={confettiRef}
        count={count}
        origin={{ x: 0, y: 0 }}
        autoStart={false}
        fadeOut={fadeOut}
        fallSpeed={3000}
        explosionSpeed={350}
        colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
