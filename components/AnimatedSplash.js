// components/AnimatedSplash.js
// Pantalla de inicio: se muestra al abrir el sistema (web y app nativa) mientras se
// restaura la sesión, y se desvanece cuando la app está lista. Usa el mismo guinda que
// la pantalla de inicio nativa y que los encabezados, para que la entrada no sea un salto.
import React, { useEffect, useRef } from 'react';
import { Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATION, timing } from '../theme/motion';

// Tiempo mínimo en pantalla: sin él, en equipos rápidos sería solo un parpadeo
const MIN_VISIBLE_MS = 700;
const FADE_OUT_MS = 380;

/**
 * @param {boolean} ready - true cuando la app ya puede mostrarse
 * @param {Function} onFinish - se llama al terminar de desvanecerse
 */
export default function AnimatedSplash({ ready = false, onFinish }) {
  const enter = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now()).current;
  const finished = useRef(false);

  // Entrada: la figura aparece subiendo un poco y después el nombre
  useEffect(() => {
    Animated.parallel([
      timing(enter, 1, { duration: DURATION.slow }),
      timing(textOpacity, 1, { duration: DURATION.slow, delay: 200 }),
    ]).start();
  }, [enter, textOpacity]);

  // Salida: cuando la app está lista y ya pasó el tiempo mínimo
  useEffect(() => {
    if (!ready || finished.current) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const timer = setTimeout(() => {
      finished.current = true;
      timing(screenOpacity, 0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) }).start(() => onFinish?.());
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity }]}
      // Mientras se desvanece no debe bloquear los toques sobre la app
      pointerEvents={ready ? 'none' : 'auto'}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando el sistema"
    >
      <LinearGradient colors={['#9F2241', '#7A1A32']} style={StyleSheet.absoluteFill} />

      <Animated.View
        style={{
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }}
      >
        <Image source={require('../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.text, { opacity: textOpacity }]}>
        <Text style={styles.title}>Sistema de Gestión Municipal</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#9F2241',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  text: {
    marginTop: 20,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
