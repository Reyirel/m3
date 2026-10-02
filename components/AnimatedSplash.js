// components/AnimatedSplash.js
// Pantalla de inicio animada: se muestra al abrir el sistema (web y app nativa) mientras
// se restaura la sesión, y se desvanece cuando la app está lista.
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Tiempo mínimo en pantalla: sin él, en equipos rápidos sería solo un parpadeo
const MIN_VISIBLE_MS = 1400;
const FADE_OUT_MS = 380;
// En web las animaciones corren en JavaScript (no hay driver nativo)
const useNativeDriver = Platform.OS !== 'web';

/**
 * @param {boolean} ready - true cuando la app ya puede mostrarse
 * @param {Function} onFinish - se llama al terminar de desvanecerse
 */
export default function AnimatedSplash({ ready = false, onFinish }) {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now()).current;
  const finished = useRef(false);

  // Entrada: el logo crece con rebote, aparece el texto, y quedan en bucle
  // el anillo que se expande y los tres puntos
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver }),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 300, useNativeDriver }),
    ]).start();

    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver })
    );
    ringLoop.start();

    const dotLoops = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver }),
          Animated.timing(dot, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver }),
          Animated.delay((2 - index) * 160),
        ])
      )
    );
    dotLoops.forEach(loop => loop.start());

    return () => {
      ringLoop.stop();
      dotLoops.forEach(loop => loop.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salida: cuando la app está lista y ya pasó el tiempo mínimo
  useEffect(() => {
    if (!ready || finished.current) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const timer = setTimeout(() => {
      finished.current = true;
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }).start(() => onFinish?.());
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0.12, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity }]}
      // Mientras se desvanece no debe bloquear los toques sobre la app
      pointerEvents={ready ? 'none' : 'auto'}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando el sistema"
    >
      <LinearGradient
        colors={['#2D0F1E', '#160008', '#000000']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="cover" />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
          <Text style={styles.title}>Sistema de Gestión Municipal</Text>
          <View style={styles.dots}>
            {dots.map((dot, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const LOGO_SIZE = 112;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2,
    borderColor: '#9F2241',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 26,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    height: 14,
    alignItems: 'flex-end',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8375F',
  },
});
