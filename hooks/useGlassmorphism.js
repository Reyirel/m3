/**
 * useGlassmorphism.js
 * 🎨 Hook para Glassmorphism Premium
 * 
 * Proporciona acceso fácil a estilos y configuración de glassmorphism
 * Basado en Apple iOS 15+ y Material Design 3
 */

import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const BLUR_INTENSITIES = {
  soft: { dark: 20, light: 30 },
  medium: { dark: 25, light: 40 },
  strong: { dark: 35, light: 50 },
  ultra: { dark: 45, light: 65 },
};

export const GLASS_COLORS = {
  base: {
    dark: 'rgba(26, 26, 29, 0.65)',
    light: 'rgba(255, 255, 255, 0.70)',
  },
  strong: {
    dark: 'rgba(26, 26, 29, 0.85)',
    light: 'rgba(255, 255, 255, 0.90)',
  },
  light: {
    dark: 'rgba(26, 26, 29, 0.45)',
    light: 'rgba(255, 255, 255, 0.50)',
  },
};

export const BORDER_COLORS = {
  top: {
    dark: 'rgba(255, 255, 255, 0.30)',
    light: 'rgba(255, 255, 255, 0.50)',
  },
  side: {
    dark: 'rgba(255, 255, 255, 0.15)',
    light: 'rgba(255, 255, 255, 0.25)',
  },
  bottom: {
    dark: 'rgba(0, 0, 0, 0.15)',
    light: 'rgba(0, 0, 0, 0.10)',
  },
};

export const GRADIENT_OVERLAYS = {
  base: {
    dark: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.02) 100%)',
    light: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.01) 100%)',
  },
  strong: {
    dark: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.04) 100%)',
    light: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.02) 100%)',
  },
};

export const RIM_GLOW_COLORS = {
  base: {
    dark: 'rgba(255, 255, 255, 0.12)',
    light: 'rgba(255, 255, 255, 0.50)',
  },
  strong: {
    dark: 'rgba(255, 255, 255, 0.20)',
    light: 'rgba(255, 255, 255, 0.70)',
  },
};

export const SHADOW_CONFIGS = {
  soft: {
    color: '#000',
    offset: { width: 0, height: 4 },
    opacity: 0.08,
    radius: 16,
    elevation: 8,
  },
  medium: {
    color: '#000',
    offset: { width: 0, height: 8 },
    opacity: 0.12,
    radius: 24,
    elevation: 10,
  },
  strong: {
    color: '#000',
    offset: { width: 0, height: 12 },
    opacity: 0.16,
    radius: 32,
    elevation: 12,
  },
  glow: {
    offset: { width: 0, height: 12 },
    radius: 32,
    elevation: 15,
  },
};

export const ANIMATIONS = {
  tap: {
    duration: 150,
    scale: 0.98,
    easing: 'easeInOut',
  },
  release: {
    duration: 300,
    scale: 1,
    easing: 'easeOutCubic',
  },
  hover: {
    duration: 200,
    scale: 1.02,
    glowIncrease: 1.5,
  },
};

/**
 * Hook principal para obtener configuración de glassmorphism
 */
export function useGlassmorphism(options = {}) {
  const { theme, isDark } = useTheme();
  const {
    intensity = 'medium',
    highlighted = false,
    variant = 'base', // 'base', 'strong', 'light'
    glowColor = null,
  } = options;

  const mode = isDark ? 'dark' : 'light';

  // Blur intensity
  const blurIntensity = useMemo(() => {
    const base = BLUR_INTENSITIES[intensity][mode];
    return highlighted ? base + 10 : base;
  }, [intensity, mode, highlighted]);

  // Glass color
  const glassColor = useMemo(() => {
    return GLASS_COLORS[variant][mode];
  }, [variant, mode]);

  // Border configuration
  const borders = useMemo(() => {
    return {
      top: {
        width: 1,
        color: BORDER_COLORS.top[mode],
      },
      side: {
        width: 1,
        color: BORDER_COLORS.side[mode],
      },
      bottom: {
        width: 1,
        color: BORDER_COLORS.bottom[mode],
      },
    };
  }, [mode]);

  // Gradient overlay
  const gradient = useMemo(() => {
    return GRADIENT_OVERLAYS[variant][mode];
  }, [variant, mode]);

  // Rim glow
  const rimGlow = useMemo(() => {
    return RIM_GLOW_COLORS[variant][mode];
  }, [variant, mode]);

  // Shadow
  const shadow = useMemo(() => {
    const baseShadow = SHADOW_CONFIGS[intensity];
    if (!glowColor) return baseShadow;

    return {
      ...SHADOW_CONFIGS.glow,
      color: glowColor,
      opacity: 0.25,
    };
  }, [intensity, glowColor]);

  return {
    blurIntensity,
    glassColor,
    borders,
    gradient,
    rimGlow,
    shadow,
    theme,
    isDark,
    mode,
  };
}

/**
 * Hook para obtener solo la configuración de sombra
 */
export function useGlassShadow(intensity = 'medium', glowColor = null) {
  const { theme } = useTheme();

  return useMemo(() => {
    const shadowConfig = SHADOW_CONFIGS[intensity];
    if (!glowColor) {
      return {
        shadowColor: shadowConfig.color,
        shadowOffset: shadowConfig.offset,
        shadowOpacity: shadowConfig.opacity,
        shadowRadius: shadowConfig.radius,
        elevation: shadowConfig.elevation,
      };
    }

    return {
      shadowColor: glowColor,
      shadowOffset: SHADOW_CONFIGS.glow.offset,
      shadowOpacity: 0.25,
      shadowRadius: SHADOW_CONFIGS.glow.radius,
      elevation: SHADOW_CONFIGS.glow.elevation,
    };
  }, [intensity, glowColor]);
}

/**
 * Hook para obtener configuración de bordes direccionados
 */
export function useDirectionalBorders() {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';

  return useMemo(() => {
    return {
      borderTopWidth: 1,
      borderTopColor: BORDER_COLORS.top[mode],
      borderBottomWidth: 1,
      borderBottomColor: BORDER_COLORS.bottom[mode],
      borderLeftWidth: 1,
      borderLeftColor: BORDER_COLORS.side[mode],
      borderRightWidth: 1,
      borderRightColor: BORDER_COLORS.bottom[mode],
    };
  }, [mode]);
}

/**
 * Hook para obtener estilos de animación
 */
export function useGlassAnimation(state = 'idle') {
  return useMemo(() => {
    const animConfig = {
      idle: {
        scale: 1,
        opacity: 1,
        duration: 300,
      },
      pressed: {
        scale: ANIMATIONS.tap.scale,
        opacity: 0.95,
        duration: ANIMATIONS.tap.duration,
      },
      hover: {
        scale: ANIMATIONS.hover.scale,
        opacity: 1,
        duration: ANIMATIONS.hover.duration,
      },
      loading: {
        scale: 1,
        opacity: 0.8,
        duration: 2000,
      },
    };

    return animConfig[state] || animConfig.idle;
  }, [state]);
}

/**
 * Hook para obtener el tint correcto para BlurView
 */
export function useGlassTint() {
  const { isDark } = useTheme();
  return isDark ? 'dark' : 'light';
}

/**
 * Hook para construir estilos de glassmorphism completos
 */
export function useGlassStyles(options = {}) {
  const glass = useGlassmorphism(options);
  const borders = useDirectionalBorders();

  return useMemo(() => {
    return {
      container: {
        borderRadius: options.borderRadius || 16,
        overflow: 'hidden',
      },
      blur: {
        intensity: glass.blurIntensity,
        tint: glass.isDark ? 'dark' : 'light',
      },
      color: {
        backgroundColor: glass.glassColor,
      },
      gradient: {
        background: glass.gradient,
        borderRadius: options.borderRadius || 16,
      },
      rimGlow: {
        backgroundColor: glass.rimGlow,
        borderRadius: options.borderRadius || 16,
        height: '20%',
        opacity: 0.8,
      },
      border: borders,
      shadow: glass.shadow,
    };
  }, [glass, borders, options.borderRadius]);
}

/**
 * Presets predefinidos
 */
export const GLASS_PRESETS = {
  card: {
    intensity: 'medium',
    variant: 'base',
    borderRadius: 12,
  },
  modal: {
    intensity: 'strong',
    variant: 'base',
    borderRadius: 20,
  },
  button: {
    intensity: 'soft',
    variant: 'light',
    borderRadius: 8,
  },
  featured: {
    intensity: 'strong',
    variant: 'strong',
    borderRadius: 16,
    highlighted: true,
  },
  minimal: {
    intensity: 'soft',
    variant: 'light',
    borderRadius: 12,
  },
};

/**
 * Hook para presets
 */
export function useGlassPreset(presetName = 'card') {
  const preset = GLASS_PRESETS[presetName] || GLASS_PRESETS.card;
  return useGlassmorphism(preset);
}

export default {
  BLUR_INTENSITIES,
  GLASS_COLORS,
  BORDER_COLORS,
  GRADIENT_OVERLAYS,
  RIM_GLOW_COLORS,
  SHADOW_CONFIGS,
  ANIMATIONS,
  GLASS_PRESETS,
  useGlassmorphism,
  useGlassShadow,
  useDirectionalBorders,
  useGlassAnimation,
  useGlassTint,
  useGlassStyles,
  useGlassPreset,
};
