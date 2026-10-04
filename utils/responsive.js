// utils/responsive.js
// Hooks y utilidades para responsive design

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { BREAKPOINTS, getColumnCount, getResponsivePadding, getResponsiveValue, RESPONSIVE_PADDING, getMaxWidth } from '../theme/tokens';

// Hook para detectar cambios de tamaño de pantalla
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;
  const isWeb = Platform.OS === 'web';
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isDesktopLarge = width >= BREAKPOINTS.desktopLarge;

  // Padding responsivo
  const responsivePadding = getResponsivePadding(width);
  const paddingObj = isDesktopLarge ? RESPONSIVE_PADDING.desktopLarge :
                     isDesktop ? RESPONSIVE_PADDING.desktop :
                     isTablet ? RESPONSIVE_PADDING.tablet :
                     RESPONSIVE_PADDING.mobile;

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isDesktopLarge,
    columns: getColumnCount(width),
    padding: responsivePadding,
    paddingObj,
    maxWidth: getMaxWidth(width),
    getValue: (values) => getResponsiveValue(width, values),
  };
};

