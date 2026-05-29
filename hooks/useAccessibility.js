/**
 * useAccessibility.js
 * ♿ Hook para simplificar implementación de accesibilidad
 * 
 * Proporciona helpers para:
 * - Generar labels semánticos automáticos
 * - Anunciar cambios dinámicamente
 * - Validar contraste de colores
 * - Asegurar touch targets de 48x48dp
 */

import { useCallback, useMemo } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const useAccessibility = () => {
  const { theme, isDark } = useTheme();

  /**
   * 🏷️ Generar label automático para tareas
   */
  const getTaskLabel = useCallback((task) => {
    const parts = [];
    
    if (task.title) parts.push(task.title);
    if (task.priority) parts.push(`Prioridad ${task.priority}`);
    if (task.status) parts.push(`Estado ${task.status}`);
    if (task.assignees?.length > 0) {
      const names = task.assignees.map(a => a.name || a.email).join(', ');
      parts.push(`Asignado a ${names}`);
    }
    
    return parts.join(', ') || 'Tarea';
  }, []);

  /**
   * 🏷️ Generar label para áreas
   */
  const getAreaLabel = useCallback((area) => {
    const parts = [];
    
    if (area.name) parts.push(area.name);
    if (area.coordinator) parts.push(`Coordinador ${area.coordinator}`);
    if (area.status) parts.push(`Estado ${area.status}`);
    
    return parts.join(', ') || 'Área';
  }, []);

  /**
   * 🎯 Generar label para filtros activos
   */
  const getActiveFiltersLabel = useCallback((filters) => {
    const activeFilters = Object.entries(filters)
      .filter(([, value]) => value !== null && value !== undefined && value !== 'todas')
      .map(([key, value]) => `${key}: ${value}`);
    
    if (activeFilters.length === 0) return 'Sin filtros activos';
    return `Filtros activos: ${activeFilters.join(', ')}`;
  }, []);

  /**
   * 📊 Generar label para métricas
   */
  const getMetricLabel = useCallback((metric) => {
    const parts = [];
    
    if (metric.label) parts.push(metric.label);
    if (metric.value) parts.push(`Valor ${metric.value}`);
    if (metric.change) {
      const trend = metric.change > 0 ? 'aumento' : 'disminución';
      parts.push(`${trend} ${Math.abs(metric.change)}%`);
    }
    
    return parts.join(', ') || 'Métrica';
  }, []);

  /**
   * 📣 Anunciar cambio dinámico (live region polite)
   */
  const announce = useCallback((message) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  /**
   * 📣 Anunciar error (live region assertive)
   */
  const announceError = useCallback((message) => {
    const fullMessage = `Error: ${message}`;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(fullMessage);
    }
  }, []);

  /**
   * 📣 Anunciar éxito
   */
  const announceSuccess = useCallback((message) => {
    const fullMessage = `Éxito: ${message}`;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(fullMessage);
    }
  }, []);

  /**
   * 🎨 Validar contraste de color (WCAG AA = 4.5:1)
   */
  const getContrastRatio = useCallback((color1, color2) => {
    const getLuminance = (hex) => {
      const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (!rgb) return 0;
      
      const [, r, g, b] = rgb;
      const [rVal, gVal, bVal] = [r, g, b].map(x => {
        const c = parseInt(x, 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rVal + 0.7152 * gVal + 0.0722 * bVal;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, []);

  /**
   * 🎨 Validar si contraste cumple WCAG AA (4.5:1 mínimo)
   */
  const meetsContrastRequirement = useCallback((color1, color2, wcagLevel = 'AA') => {
    const ratio = getContrastRatio(color1, color2);
    const requirement = wcagLevel === 'AAA' ? 7 : 4.5;
    return ratio >= requirement;
  }, [getContrastRatio]);

  /**
   * 🖱️ Props de touch area mínima (48x48dp)
   */
  const getTouchableProps = useCallback(() => ({
    hitSlop: {
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
    },
  }), []);

  /**
   * ✅ Validar form field completo
   */
  const getFormFieldProps = useCallback((field) => {
    return {
      accessibilityRole: 'text',
      accessibilityLabel: field.label,
      accessibilityHint: field.required ? 'Campo requerido' : 'Campo opcional',
      accessibilityState: {
        disabled: field.disabled || false,
      },
    };
  }, []);

  /**
   * 🎯 Generar props para botón accesible
   */
  const getButtonProps = useCallback((props) => {
    return {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: props.label,
      accessibilityHint: props.hint,
      accessibilityState: {
        disabled: props.disabled || false,
      },
      ...getTouchableProps(),
    };
  }, [getTouchableProps]);

  /**
   * 📋 Props para región (secciones principales)
   */
  const getRegionProps = useCallback((name) => {
    return {
      accessible: true,
      accessibilityRole: 'header',
      accessibilityLabel: name,
    };
  }, []);

  /**
   * 🔄 Props para elemento con live region
   */
  const getLiveRegionProps = useCallback((type = 'polite') => {
    return {
      accessible: true,
      accessibilityRole: 'alert',
      accessibilityLiveRegion: type, // 'polite', 'assertive'
    };
  }, []);

  /**
   * 🎨 Colores con contraste garantizado
   */
  const getAccessibleColor = useCallback((textColor, bgColor) => {
    const ratio = getContrastRatio(textColor, bgColor);
    
    if (ratio >= 4.5) {
      return { pass: true, ratio };
    }
    
    // Si no cumple, ajustar automáticamente
    const adjusted = isDark ? '#FFFFFF' : '#000000';
    const newRatio = getContrastRatio(adjusted, bgColor);
    
    return {
      pass: newRatio >= 4.5,
      ratio: newRatio,
      recommendedColor: adjusted,
    };
  }, [getContrastRatio, isDark]);

  return {
    // 🏷️ Label generators
    getTaskLabel,
    getAreaLabel,
    getActiveFiltersLabel,
    getMetricLabel,
    
    // 📣 Announcements
    announce,
    announceError,
    announceSuccess,
    
    // 🎨 Color contrast
    getContrastRatio,
    meetsContrastRequirement,
    getAccessibleColor,
    
    // 🖱️ Touch targets
    getTouchableProps,
    
    // ✅ Form & Button helpers
    getFormFieldProps,
    getButtonProps,
    getRegionProps,
    getLiveRegionProps,
    
    // 🎯 Theme
    theme,
    isDark,
  };
};

/**
 * Ejemplo de uso:
 * 
 * const { getTaskLabel, announce, getButtonProps } = useAccessibility();
 * 
 * <Button
 *   {...getButtonProps({
 *     label: 'Crear tarea',
 *     hint: 'Abre formulario para nueva tarea'
 *   })}
 *   onPress={() => {
 *     announce('Tarea creada: ' + taskName);
 *   }}
 * />
 */
