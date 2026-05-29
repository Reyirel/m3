/**
 * ScreenWithAmbient.js
 * Wrapper component para agregar AmbientOrbs a cualquier pantalla
 * + contenido principal con profundidad visual
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import AmbientOrbs from './AmbientOrbs';
import { useTheme } from '../contexts/ThemeContext';

export default function ScreenWithAmbient({
  children,
  intensity = 'medium',
  style,
  backgroundColor,
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: backgroundColor || theme.bg }, style]}>
      {/* Ambient Orbs de fondo */}
      <AmbientOrbs intensity={intensity} />

      {/* Contenido principal */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  content: {
    flex: 1,
    zIndex: 1,
  },
});
