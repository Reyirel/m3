// utils/responsiveTypography.js
// ✨ Helper para tipografía responsiva escalable
// Problema: Tipografía fija en móvil pequeño ocupaba mucho espacio
// Solución: Función que escala linealmente según viewport

import { BREAKPOINTS } from '../theme/tokens';

/**
 * Calcula tamaño de fuente responsivo con interpolación lineal
 * @param {number} screenWidth - Ancho de pantalla
 * @param {number} mobileSize - Tamaño en móvil pequeño (320px)
 * @param {number} tabletSize - Tamaño en tablet (768px)
 * @param {number} desktopSize - Tamaño en desktop (1024px)
 * @returns {number} Tamaño de fuente calculado
 */
export const getResponsiveFont = (screenWidth, mobileSize, tabletSize, desktopSize) => {
  if (screenWidth >= BREAKPOINTS.desktop) {
    return desktopSize;
  }
  if (screenWidth >= BREAKPOINTS.tablet) {
    // Interpolación lineal entre tablet y desktop
    const ratio = (screenWidth - BREAKPOINTS.tablet) / (BREAKPOINTS.desktop - BREAKPOINTS.tablet);
    return tabletSize + (desktopSize - tabletSize) * ratio;
  }
  if (screenWidth >= BREAKPOINTS.mobileLarge) {
    // Interpolación lineal entre mobile small y mobile large
    const ratio = (screenWidth - BREAKPOINTS.mobile) / (BREAKPOINTS.mobileLarge - BREAKPOINTS.mobile);
    return mobileSize + (tabletSize - mobileSize) * ratio;
  }
  return mobileSize;
};

/**
 * Presets de tipografía responsiva
 */
export const responsiveTypography = {
  // Títulos principales
  h1: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 24, 28, 32),
    fontWeight: 'bold',
    lineHeight: getResponsiveFont(screenWidth, 28, 32, 40),
  }),

  // Subtítulos / Headings secundarios
  h2: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 20, 24, 28),
    fontWeight: '600',
    lineHeight: getResponsiveFont(screenWidth, 24, 28, 32),
  }),

  // Headings terciarios
  h3: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 18, 20, 24),
    fontWeight: '600',
    lineHeight: getResponsiveFont(screenWidth, 22, 24, 28),
  }),

  // Body text
  body: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 14, 15, 16),
    fontWeight: '400',
    lineHeight: getResponsiveFont(screenWidth, 20, 22, 24),
  }),

  // Body pequeño
  bodySmall: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 12, 13, 14),
    fontWeight: '400',
    lineHeight: getResponsiveFont(screenWidth, 16, 18, 20),
  }),

  // Caption
  caption: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 11, 12, 12),
    fontWeight: '400',
    lineHeight: getResponsiveFont(screenWidth, 14, 16, 16),
  }),

  // Button text
  button: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 14, 16, 16),
    fontWeight: '600',
    lineHeight: getResponsiveFont(screenWidth, 20, 24, 24),
  }),

  // Greeting (ej: "¡Bienvenido!")
  greeting: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 12, 14, 16),
    fontWeight: '500',
  }),

  // Label (ej: Campos de formulario)
  label: (screenWidth) => ({
    fontSize: getResponsiveFont(screenWidth, 12, 13, 14),
    fontWeight: '600',
  }),
};

/**
 * Spacing responsivo
 */
export const responsiveSpacing = {
  // Padding de contenedor principal
  containerPadding: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.desktop) return 24;
    if (screenWidth >= BREAKPOINTS.tablet) return 20;
    if (screenWidth >= BREAKPOINTS.mobileLarge) return 16;
    return 12;
  },

  // Gap entre items en grid/list
  itemGap: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.tablet) return 16;
    if (screenWidth >= BREAKPOINTS.mobileLarge) return 12;
    return 8;
  },

  // Spacing vertical en secciones
  sectionSpacing: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.desktop) return 32;
    if (screenWidth >= BREAKPOINTS.tablet) return 24;
    return 16;
  },
};

/**
 * Heights responsivos para componentes
 */
export const responsiveHeights = {
  // Alto de header
  header: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.tablet) return 80;
    return 64;
  },

  // Alto mínimo de tasks/items
  listItemHeight: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.desktop) return 80;
    return 70;
  },

  // Alto de cards
  cardHeight: (screenWidth) => {
    if (screenWidth >= BREAKPOINTS.tablet) return 140;
    return 120;
  },
};

/**
 * EJEMPLO DE USO EN COMPONENTE:
 * 
 * import { getResponsiveFont, responsiveTypography } from '../utils/responsiveTypography';
 * 
 * const MyComponent = () => {
 *   const { width } = useResponsive();
 * 
 *   return (
 *     <View>
 *       <Text style={[
 *         responsiveTypography.h1(width),
 *         { color: theme.text }
 *       ]}>
 *         Mi Título
 *       </Text>
 * 
 *       <Text style={responsiveTypography.body(width)}>
 *         Mi contenido
 *       </Text>
 *     </View>
 *   );
 * };
 */

export default {
  getResponsiveFont,
  responsiveTypography,
  responsiveSpacing,
  responsiveHeights,
};
