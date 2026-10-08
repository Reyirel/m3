// theme/motion.js
// Lenguaje de movimiento de la app: duraciones, resortes y curvas en un solo lugar.
// Las animaciones se crean con `timing`, `spring` y `loop` de este archivo para que
// todas respeten "reducir movimiento" (ajuste de accesibilidad del sistema).
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

export const DURATION = {
  fast: 150,   // respuesta al toque
  normal: 250, // cambios de estado, apariciones
  slow: 400,   // entradas de pantalla
};

export const SPRING = {
  press: { tension: 300, friction: 20 }, // presionar: rápido y sin rebote
  enter: { tension: 80, friction: 12 },  // contenido que entra
  sheet: { tension: 65, friction: 11 },  // hojas y paneles
};

export const EASING = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.ease),
};

// Escala al presionar una tarjeta o un botón, y opacidad de los TouchableOpacity
export const PRESS_SCALE = 0.97;
export const ACTIVE_OPACITY = 0.7;

// Fondo detrás de hojas y diálogos
export const OVERLAY_COLOR = 'rgba(0,0,0,0.5)';

// En web no hay driver nativo: pedirlo solo genera avisos en la consola
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

let reduced = false;
const listeners = new Set();

const setReduced = (value) => {
  const next = !!value;
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((listener) => listener(reduced));
};

try {
  if (Platform.OS === 'web') {
    const query = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (query) {
      setReduced(query.matches);
      const onChange = (event) => setReduced(event.matches);
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  } else {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduced).catch(() => {});
    AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
  }
} catch {
  // Sin acceso al ajuste: se anima con normalidad
}

export const isReducedMotion = () => reduced;

/** true cuando el usuario pidió reducir el movimiento */
export function useReducedMotion() {
  const [value, setValue] = useState(reduced);
  useEffect(() => {
    listeners.add(setValue);
    setValue(reduced);
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}

/** Animated.timing con los valores de la app. Con movimiento reducido llega al final sin animar. */
export const timing = (value, toValue, { duration = DURATION.normal, easing = EASING.enter, delay = 0 } = {}) =>
  Animated.timing(value, {
    toValue,
    duration: reduced ? 0 : duration,
    delay: reduced ? 0 : delay,
    easing,
    useNativeDriver: USE_NATIVE_DRIVER,
  });

/** Animated.spring con uno de los resortes de SPRING. */
export const spring = (value, toValue, preset = SPRING.enter, { delay = 0 } = {}) => (
  reduced
    ? Animated.timing(value, { toValue, duration: 0, useNativeDriver: USE_NATIVE_DRIVER })
    : Animated.spring(value, { toValue, delay, ...preset, useNativeDriver: USE_NATIVE_DRIVER })
);

const NO_LOOP = { start: () => {}, stop: () => {}, reset: () => {} };

/** Animated.loop que no corre con movimiento reducido. */
export const loop = (animation) => (reduced ? NO_LOOP : Animated.loop(animation));
