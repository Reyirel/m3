/**
 * MeshBackground.js - Fondo premium con gradiente mesh
 * Crea un fondo con múltiples capas de color que dan profundidad real
 * al glassmorphism — sin esto, el vidrio no tiene nada que "atravesar"
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function MeshBackground({ children, style }) {
  const { isDark } = useTheme();

  const layers = useMemo(() => {
    if (isDark) {
      return [
        // Capa base oscura con tinte burgundy sutil
        {
          colors: ['#0D080B', '#130A0F', '#0D080B'],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
          style: StyleSheet.absoluteFill,
        },
        // Glow top-left: rojo primario — más intenso para que el blur tenga más color
        {
          colors: ['rgba(159,34,65,0.38)', 'transparent'],
          start: { x: 0, y: 0 },
          end: { x: 0.65, y: 0.65 },
          style: { ...StyleSheet.absoluteFillObject, height: '55%' },
        },
        // Glow top-right: azul secundario — más vivido
        {
          colors: ['rgba(91,123,255,0.28)', 'transparent'],
          start: { x: 1, y: 0 },
          end: { x: 0.2, y: 0.8 },
          style: { ...StyleSheet.absoluteFillObject, top: 0, height: '45%' },
        },
        // Glow bottom-center: verde más visible
        {
          colors: ['transparent', 'rgba(16,185,129,0.20)'],
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          style: { ...StyleSheet.absoluteFillObject, top: '45%' },
        },
        // Glow bottom-left: púrpura sutil para riqueza tonal
        {
          colors: ['transparent', 'rgba(120,50,200,0.14)'],
          start: { x: 0, y: 0.5 },
          end: { x: 0.5, y: 1 },
          style: { ...StyleSheet.absoluteFillObject, top: '60%' },
        },
      ];
    } else {
      return [
        // Base lavanda cálida — fondo neutro sobre el que se ven las tarjetas
        {
          colors: ['#F2EEF8', '#EDE8F5', '#F0EDF8'],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
          style: StyleSheet.absoluteFill,
        },
        // Bloom top-left: burgundy más intenso para que el blur lo capte
        {
          colors: ['rgba(159,34,65,0.22)', 'transparent'],
          start: { x: 0, y: 0 },
          end: { x: 0.70, y: 0.70 },
          style: { ...StyleSheet.absoluteFillObject, height: '55%' },
        },
        // Bloom top-right: azul/índigo — visible tras blur + saturate
        {
          colors: ['rgba(91,123,255,0.18)', 'transparent'],
          start: { x: 1, y: 0 },
          end: { x: 0.1, y: 0.9 },
          style: { ...StyleSheet.absoluteFillObject, height: '45%' },
        },
        // Bloom bottom: verde menta
        {
          colors: ['transparent', 'rgba(16,185,129,0.14)'],
          start: { x: 0.3, y: 0 },
          end: { x: 0.7, y: 1 },
          style: { ...StyleSheet.absoluteFillObject, top: '55%' },
        },
        // Highlight central: blanco para suavizar la mezcla y mantener legibilidad
        {
          colors: ['transparent', 'rgba(255,255,255,0.40)', 'transparent'],
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          style: { ...StyleSheet.absoluteFillObject },
        },
      ];
    }
  }, [isDark]);

  return (
    <View style={[styles.container, style]}>
      {layers.map((layer, i) => (
        <LinearGradient
          key={i}
          colors={layer.colors}
          start={layer.start}
          end={layer.end}
          style={layer.style}
          pointerEvents="none"
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
