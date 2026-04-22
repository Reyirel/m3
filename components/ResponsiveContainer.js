// components/ResponsiveContainer.js
// Contenedor responsivo que centraliza contenido en web y adapta padding por dispositivo
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../utils/responsive';

export default function ResponsiveContainer({
  children,
  style = {},
  contentStyle = {},
  _safeAreaEnabled = false,
}) {
  const { isDesktop, isDesktopLarge, paddingObj } = useResponsive();
  const isWeb = Platform.OS === 'web';

  // Ancho máximo del contenedor
  const containerMaxWidth = isDesktopLarge ? 1120 : isDesktop ? 1024 : '100%';

  // Calcular padding responsivo
  const responsivePadding = isDesktopLarge
    ? paddingObj.horizontal
    : isDesktop
    ? paddingObj.horizontal
    : paddingObj.horizontal;

  const styles = StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: 'transparent',
      alignItems: isWeb && isDesktop ? 'center' : 'stretch',
      ...style,
    },
    container: {
      flex: 1,
      width: isWeb && isDesktop ? containerMaxWidth : '100%',
      maxWidth: isWeb && isDesktop ? containerMaxWidth : undefined,
      paddingHorizontal: responsivePadding,
      ...contentStyle,
    },
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {children}
      </View>
    </View>
  );
}
