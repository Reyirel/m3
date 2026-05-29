// utils/GlassView.js
// Vista glassmorphism multiplataforma
// — Web:    backdrop-filter: blur()
// — Native: expo-blur BlurView (iOS/Android)
// — Fallback: semi-transparente sin blur (listas, rendimiento)
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

let BlurView = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch (_e) {
  // expo-blur no disponible
}

/**
 * GlassView — tarjeta de vidrio multiplataforma
 * @param {number}  intensity  Intensidad del blur (0-100). Default 60
 * @param {string}  tint       'dark' | 'light' | 'default'
 * @param {boolean} noBlur     Forzar modo sin blur (para listas de alto rendimiento)
 * @param {object}  style      Estilos adicionales
 */
export function GlassView({ intensity = 60, tint = 'dark', noBlur = false, style, children, ...props }) {
  // Web: usa backdropFilter CSS — intensidad real a escala Apple (20-40px) + saturate
  if (Platform.OS === 'web') {
    const px = Math.min(Math.round(intensity * 0.5), 40); // 60 → 30px, cap at 40px
    const filter = `blur(${px}px) saturate(180%)`;
    return (
      <View
        style={[
          style,
          {
            backdropFilter: filter,
            WebkitBackdropFilter: filter,
          },
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  // Native sin blur (modo rendimiento para listas)
  if (noBlur || !BlurView) {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  }

  // Native: expo-blur
  return (
    <BlurView intensity={intensity} tint={tint} style={style} {...props}>
      {children}
    </BlurView>
  );
}

export default GlassView;
