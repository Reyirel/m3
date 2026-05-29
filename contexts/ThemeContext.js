// contexts/ThemeContext.js
// Contexto para manejar el tema (claro/oscuro) de la aplicación
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// Usar globalThis para que React.lazy() bundles compartan la misma instancia de contexto
if (!globalThis.__THEME_CONTEXT__) {
  globalThis.__THEME_CONTEXT__ = createContext();
}
const ThemeContext = globalThis.__THEME_CONTEXT__;

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Retornar tema por defecto en lugar de lanzar error
    return {
      isDark: false,
      toggleTheme: () => {},
      theme: {
        primary: '#9F2241',
        primaryLight: '#BF2B50',
        primaryDark: '#7A1A32',
        background: '#F2F2F7',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        cardBackground: '#FFFFFF',
        surfaceL1: '#FFFFFF',
        surfaceL2: '#F2F2F7',
        surfaceL3: '#E5E5EA',
        text: '#000000',
        textSecondary: 'rgba(60,60,67,0.6)',
        border: '#C6C6C8',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#007AFF',
        glass: 'rgba(255,255,255,0.88)',
        glassBorder: 'rgba(0,0,0,0.06)',
        radiusSm: 10,
        radiusMd: 16,
        radiusLg: 24,
        radiusXl: 32,
        radiusFull: 999,
      }
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        // Sin preferencia guardada → usar tema del sistema operativo
        setIsDark(Appearance.getColorScheme() === 'dark');
      }
    } catch {
      setIsDark(Appearance.getColorScheme() === 'dark');
    }
  };

  const toggleTheme = useCallback(async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    } catch (error) {
      // Error saving theme
    }
  }, [isDark]);

  const theme = useMemo(() => ({
    // ========== COLORES PRINCIPALES ==========
    // Brand borgoña — más vibrante y refinado (Apple-style saturado)
    primary: isDark ? '#C0223E' : '#9F2241',
    primaryLight: isDark ? '#E0365A' : '#BF2B50',
    primaryDark: isDark ? '#9F1F38' : '#7A1A32',
    primaryAlpha: isDark ? 'rgba(192, 34, 62, 0.18)' : 'rgba(159, 34, 65, 0.12)',

    secondary: isDark ? '#636EFA' : '#4F5EDB',
    secondaryLight: isDark ? '#818CF8' : '#6B7AE8',
    secondaryDark: isDark ? '#4B56D2' : '#3A4BC4',

    accent: isDark ? '#FF9F0A' : '#FF9500',
    accentLight: isDark ? '#FFB340' : '#FFB300',
    accentDark: isDark ? '#CC7D00' : '#CC7700',

    // ========== FONDOS ==========
    // Apple: pure black dark, system gray light
    background: isDark ? '#000000' : '#F2F2F7',
    backgroundSecondary: isDark ? '#0A0A0A' : '#FFFFFF',
    backgroundTertiary: isDark ? '#141414' : '#E5E5EA',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardElevated: isDark ? '#2C2C2E' : '#FAFAFA',

    // ========== GLASSMORPHISM ==========
    // Materiales opacos estilo Apple Clarity / Windows 11 Mica
    // Dark: superficie oscura translúcida con borde blanco sutil
    // Light: superficie blanca muy opaca con borde gris sutil
    glass:             isDark ? 'rgba(28, 28, 30, 0.82)'  : 'rgba(255, 255, 255, 0.88)',
    glassStrong:       isDark ? 'rgba(44, 44, 46, 0.94)'  : 'rgba(255, 255, 255, 0.97)',
    glassLight:        isDark ? 'rgba(28, 28, 30, 0.55)'  : 'rgba(255, 255, 255, 0.68)',
    glassPrimary:      isDark ? 'rgba(192, 34, 62, 0.22)' : 'rgba(159, 34, 65, 0.07)',
    glassBorder:       isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
    glassBorderStrong: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)',
    glassBorderSubtle: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    glassHighlight:    isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1.00)',
    glassShadow:       isDark ? 'rgba(0, 0, 0, 0.60)'     : 'rgba(0, 0, 0, 0.10)',
    glassBlur: 40,

    // ========== TEXTOS ==========
    // Apple SF Pro-caliber hierarchy
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(235,235,245,0.80)' : 'rgba(60,60,67,0.75)',
    textTertiary: isDark ? 'rgba(235,235,245,0.55)' : 'rgba(60,60,67,0.55)',
    textMuted: isDark ? 'rgba(235,235,245,0.38)' : 'rgba(60,60,67,0.50)',
    textInverted: isDark ? '#000000' : '#FFFFFF',

    // ========== BORDES Y SEPARADORES ==========
    border: isDark ? '#38383A' : '#C6C6C8',
    borderLight: isDark ? '#2C2C2E' : '#E5E5EA',
    borderStrong: isDark ? '#48484A' : '#AEAEB2',
    divider: isDark ? '#38383A' : '#C6C6C8',

    // ========== ESTADOS ==========
    // Apple system colors — vivos y accesibles
    success: isDark ? '#30D158' : '#34C759',
    successLight: isDark ? '#5DE27E' : '#63D471',
    successDark: isDark ? '#25A244' : '#28A745',
    successAlpha: isDark ? 'rgba(48, 209, 88, 0.16)' : 'rgba(52, 199, 89, 0.14)',

    error: isDark ? '#FF453A' : '#FF3B30',
    errorLight: isDark ? '#FF6961' : '#FF6B6B',
    errorDark: isDark ? '#D70015' : '#C0001A',
    errorAlpha: isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 59, 48, 0.12)',

    warning: isDark ? '#FFD60A' : '#FF9500',
    warningLight: isDark ? '#FFE426' : '#FFB340',
    warningDark: isDark ? '#C09200' : '#C07600',
    warningAlpha: isDark ? 'rgba(255, 214, 10, 0.16)' : 'rgba(255, 149, 0, 0.12)',

    info: isDark ? '#0A84FF' : '#007AFF',
    infoLight: isDark ? '#409CFF' : '#47A0FF',
    infoDark: isDark ? '#0071E3' : '#005EC5',
    infoAlpha: isDark ? 'rgba(10, 132, 255, 0.16)' : 'rgba(0, 122, 255, 0.12)',

    // ========== PRIORIDADES ==========
    priorityHigh:   isDark ? '#FF453A' : '#FF3B30',
    priorityHighBg: isDark ? 'rgba(255, 69, 58, 0.14)' : 'rgba(255, 59, 48, 0.10)',
    priorityMedium:   isDark ? '#FFD60A' : '#FF9500',
    priorityMediumBg: isDark ? 'rgba(255, 214, 10, 0.14)' : 'rgba(255, 149, 0, 0.10)',
    priorityLow:   isDark ? '#30D158' : '#34C759',
    priorityLowBg: isDark ? 'rgba(48, 209, 88, 0.14)' : 'rgba(52, 199, 89, 0.10)',

    // ========== ESTADOS DE TAREAS ==========
    statusPending:      isDark ? '#FF9F0A' : '#FF9500',
    statusPendingBg:    isDark ? 'rgba(255, 159, 10, 0.14)' : 'rgba(255, 149, 0, 0.10)',
    statusInProgress:   isDark ? '#0A84FF' : '#007AFF',
    statusInProgressBg: isDark ? 'rgba(10, 132, 255, 0.14)' : 'rgba(0, 122, 255, 0.10)',
    statusReview:       isDark ? '#BF5AF2' : '#AF52DE',
    statusReviewBg:     isDark ? 'rgba(191, 90, 242, 0.14)' : 'rgba(175, 82, 222, 0.10)',
    statusClosed:       isDark ? '#30D158' : '#34C759',
    statusClosedBg:     isDark ? 'rgba(48, 209, 88, 0.14)' : 'rgba(52, 199, 89, 0.10)',

    // ========== GRADIENTES ==========
    // Headers: oscuros limpios en dark, borgoña puro en light
    gradientPrimary: isDark
      ? ['#C0223E', '#9F1F38', '#7A1A32']
      : ['#9F2241', '#BF2B50', '#C72C54'],
    gradientSecondary: isDark
      ? ['#1C1C1E', '#2C2C2E']
      : ['#FFFFFF', '#F2F2F7'],
    gradientHeader: isDark
      ? ['#1C1C1E', '#141416']
      : ['#9F2241', '#7A1A32'],
    gradientBackground: isDark
      ? ['#000000', '#0A0A0A']
      : ['#F2F2F7', '#FFFFFF'],
    gradientCard: isDark
      ? ['rgba(44, 44, 46, 0.95)', 'rgba(28, 28, 30, 0.90)']
      : ['rgba(255, 255, 255, 0.98)', 'rgba(250, 250, 250, 0.94)'],
    gradientSuccess: isDark ? ['#30D158', '#25A244'] : ['#34C759', '#28A745'],
    gradientWarning: isDark ? ['#FFD60A', '#C09200'] : ['#FF9500', '#C07600'],
    gradientError:   isDark ? ['#FF453A', '#D70015'] : ['#FF3B30', '#C0001A'],
    gradientInfo:    isDark ? ['#0A84FF', '#0071E3'] : ['#007AFF', '#005EC5'],
    gradientOverlay: isDark
      ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']
      : ['rgba(242,242,247,0)', 'rgba(242,242,247,0.90)'],

    // ========== SOMBRAS ==========
    // Multi-layer Apple-style (soft ambiance + directional)
    shadow:        isDark ? 'rgba(0, 0, 0, 0.50)' : 'rgba(0, 0, 0, 0.08)',
    shadowMedium:  isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.14)',
    shadowStrong:  isDark ? 'rgba(0, 0, 0, 0.80)' : 'rgba(0, 0, 0, 0.22)',
    shadowColored: isDark ? 'rgba(192, 34, 62, 0.40)' : 'rgba(159, 34, 65, 0.20)',

    // ========== OVERLAYS ==========
    overlay:       isDark ? 'rgba(0, 0, 0, 0.82)' : 'rgba(0, 0, 0, 0.48)',
    overlayLight:  isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.28)',
    overlayStrong: isDark ? 'rgba(0, 0, 0, 0.94)' : 'rgba(0, 0, 0, 0.68)',

    // ========== INPUTS ==========
    // Apple: fondo neutro claro dentro del card, borde suave
    inputBackground:    isDark ? '#2C2C2E' : '#F2F2F7',
    inputBorder:        isDark ? '#48484A' : '#D1D1D6',
    inputBorderFocused: isDark ? '#C0223E' : '#9F2241',
    inputPlaceholder:   isDark ? 'rgba(235,235,245,0.38)' : 'rgba(60,60,67,0.60)',
    inputText:          isDark ? '#FFFFFF' : '#000000',

    // ========== BOTONES ==========
    buttonPrimaryBg:      isDark ? '#C0223E' : '#9F2241',
    buttonPrimaryText:    '#FFFFFF',
    buttonSecondaryBg:    isDark ? '#2C2C2E' : '#F2F2F7',
    buttonSecondaryText:  isDark ? '#FFFFFF' : '#000000',
    buttonGhostBg:        'transparent',
    buttonGhostText:      isDark ? '#C0223E' : '#9F2241',
    buttonDisabledBg:     isDark ? '#2C2C2E' : '#E5E5EA',
    buttonDisabledText:   isDark ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.30)',

    // ========== SKELETON/SHIMMER ==========
    shimmerBase:      isDark ? '#2C2C2E' : '#E5E5EA',
    shimmerHighlight: isDark ? '#3A3A3C' : '#F2F2F7',

    // ========== BADGES ==========
    badgeBackground: isDark ? '#3A3A3C' : '#E5E5EA',
    badgeText:       isDark ? '#FFFFFF' : '#000000',

    // ========== SUPERFICIES ==========
    // Sistema de elevación: 0=base → L3=más elevado
    surface:        isDark ? '#1C1C1E' : '#FFFFFF',
    surfaceVariant: isDark ? '#2C2C2E' : '#F2F2F7',
    cardBackground: isDark ? '#1C1C1E' : '#FFFFFF',
    surfaceL1: isDark ? '#1C1C1E' : '#FFFFFF',
    surfaceL2: isDark ? '#2C2C2E' : '#F2F2F7',
    surfaceL3: isDark ? '#3A3A3C' : '#E5E5EA',

    // ========== BORDER RADIUS ==========
    // Apple HIG: 10→16 para tarjetas, 20→28 para sheets
    radiusSm: 10,
    radiusMd: 16,
    radiusLg: 24,
    radiusXl: 32,
    radiusFull: 999,

    shadowColor: '#000000',

    icon:         isDark ? '#FFFFFF' : '#9F2241',
    iconInactive: isDark ? 'rgba(235,235,245,0.38)' : 'rgba(60,60,67,0.50)',

    isDark,
  }), [isDark]);

  const contextValue = useMemo(
    () => ({ isDark, toggleTheme, theme }),
    [isDark, toggleTheme, theme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
