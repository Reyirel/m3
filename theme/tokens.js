// theme/tokens.js
// Sistema de Design Tokens para consistencia visual

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  // Tamaños de fuente para uso directo
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
  },
  // Pesos de fuente
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const BREAKPOINTS = {
  mobile: 0,
  mobileLarge: 375,
  tablet: 768,
  desktop: 1024,
  desktopLarge: 1440,
};

export const TOUCH_TARGET = {
  min: 44, // Mínimo recomendado iOS/Android
  comfortable: 48,
  large: 56,
};

// Ancho máximo para contenedores
export const MAX_WIDTHS = {
  content: 1280,    // Ancho máximo para contenido principal
  contentPadded: 1120, // Con padding incluido
  narrow: 800,      // Para forms y contenido estrecho
  card: 600,        // Para cards individuales
  modal: 500,
};

// Padding responsivo por pantalla
export const RESPONSIVE_PADDING = {
  mobile: { horizontal: 12, vertical: 16 },
  tablet: { horizontal: 20, vertical: 24 },
  desktop: { horizontal: 32, vertical: 32 },
  desktopLarge: { horizontal: 48, vertical: 40 },
};

// Glassmorphism tokens — usar para cards, modals, inputs con efecto vidrio
export const GLASS = {
  // Modo oscuro: vidrio sutil sobre fondo profundo
  dark: {
    bg:          'rgba(255, 255, 255, 0.07)',
    bgMedium:    'rgba(255, 255, 255, 0.11)',
    bgStrong:    'rgba(255, 255, 255, 0.17)',
    bgPrimary:   'rgba(159, 34, 65, 0.20)',
    border:      'rgba(255, 255, 255, 0.14)',
    borderLight: 'rgba(255, 255, 255, 0.07)',
    highlight:   'rgba(255, 255, 255, 0.04)',
    shadow:      'rgba(0, 0, 0, 0.50)',
    blur:        20,
  },
  // Modo claro: vidrio esmerilado / frosted glass
  light: {
    bg:          'rgba(255, 255, 255, 0.72)',
    bgMedium:    'rgba(255, 255, 255, 0.85)',
    bgStrong:    'rgba(255, 255, 255, 0.94)',
    bgPrimary:   'rgba(159, 34, 65, 0.08)',
    border:      'rgba(255, 255, 255, 0.65)',
    borderLight: 'rgba(0, 0, 0, 0.06)',
    highlight:   'rgba(255, 255, 255, 1.0)',
    shadow:      'rgba(0, 0, 0, 0.10)',
    blur:        20,
  },
};

// Duraciones y curvas de animación estándar
// Usar estos valores en lugar de hardcodear ms en cada pantalla
export const ANIMATION = {
  // Duraciones
  fast: 150,       // micro-interacciones (feedback táctil)
  normal: 300,     // transiciones de estado
  slow: 500,       // entradas de pantalla
  verySlow: 800,   // animaciones de celebración/énfasis

  // Spring configs predefinidos
  spring: {
    snappy: { tension: 100, friction: 8 },   // rápido y con rebote
    smooth: { tension: 80,  friction: 12 },  // suave y preciso
    gentle: { tension: 50,  friction: 7 },   // lento y natural
  },

  // Timing easing por tipo de movimiento
  // Usar con Easing de react-native
  easing: {
    enter: 'Easing.out(Easing.cubic)',   // elementos que entran
    exit:  'Easing.in(Easing.cubic)',    // elementos que salen
    inOut: 'Easing.inOut(Easing.ease)', // movimientos continuos
  },
};

// Helper para obtener responsive values
export const getResponsiveValue = (screenWidth, values) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return values.desktopLarge || values.desktop;
  if (screenWidth >= BREAKPOINTS.desktop) return values.desktop;
  if (screenWidth >= BREAKPOINTS.tablet) return values.tablet;
  if (screenWidth >= BREAKPOINTS.mobileLarge) return values.mobileLarge || values.mobile;
  return values.mobile;
};

// Helper para columns en grid
export const getColumnCount = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return 4;
  if (screenWidth >= BREAKPOINTS.desktop) return 3;
  if (screenWidth >= BREAKPOINTS.tablet) return 2;
  return 1;
};

// Helper para padding responsive basado en ancho
export const getResponsivePadding = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return RESPONSIVE_PADDING.desktopLarge.horizontal;
  if (screenWidth >= BREAKPOINTS.desktop) return RESPONSIVE_PADDING.desktop.horizontal;
  if (screenWidth >= BREAKPOINTS.tablet) return RESPONSIVE_PADDING.tablet.horizontal;
  return RESPONSIVE_PADDING.mobile.horizontal;
};

// Helper para obtener ancho máximo del contenedor
export const getMaxWidth = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return MAX_WIDTHS.contentPadded;
  return screenWidth;
};
