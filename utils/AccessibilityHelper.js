/**
 * 🎯 AccessibilityHelper.js - Centralized accessibility utilities
 * 
 * Proporciona patrones consistentes para accesibilidad en toda la app
 * Cumple con WCAG 2.1 AA standards
 */

export const AccessibilityRoles = {
  BUTTON: 'button',
  LINK: 'link',
  IMAGE: 'image',
  SEARCH: 'search',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  NONE: 'none',
};

/**
 * 📌 Generar label accesible para tareas
 */
export function getTaskAccessibilityLabel(task) {
  if (!task) return 'Tarea desconocida';
  
  const status = task.status === 'cerrada' ? '(Completada)' : '';
  const priority = task.priority ? `, prioridad ${task.priority}` : '';
  const assignee = task.assignedTo?.length ? `, asignado a ${task.assignedTo[0]}` : '';
  
  return `${task.title}${priority}${assignee}${status}`;
}

/**
 * 📌 Generar label accesible para usuario
 */
export function getUserAccessibilityLabel(user) {
  if (!user) return 'Usuario desconocido';
  return `${user.displayName || user.email}, rol ${user.role}`;
}

/**
 * 📌 Generar label accesible para estado de sincronización
 */
export function getSyncStatusLabel(isOnline) {
  return isOnline ? 'Conectado a la red' : 'Sin conexión (modo offline)';
}

/**
 * 📌 Patrones comunes de hints de accesibilidad
 */
export const AccessibilityHints = {
  TAP_TO_EDIT: 'Toca para editar',
  TAP_TO_DELETE: 'Toca para eliminar',
  DOUBLE_TAP_TO_OPEN: 'Toca dos veces para abrir',
  SWIPE_FOR_OPTIONS: 'Desliza para más opciones',
  EXPANDABLE: (expanded) => expanded ? 'Presiona para contraer' : 'Presiona para expandir',
  TAP_TO_SEARCH: 'Toca para buscar tareas',
  TAP_TO_FILTER: 'Toca para mostrar filtros',
  TAP_TO_SORT: 'Toca para cambiar orden',
};

/**
 * 📌 Props estándar para botones accesibles
 */
export function getButtonAccessibilityProps(label, hint = null) {
  return {
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button',
    accessible: true,
  };
}

/**
 * 📌 Props estándar para inputs accesibles
 */
export function getInputAccessibilityProps(label, hint = null, required = false) {
  return {
    accessibilityLabel: label,
    accessibilityHint: hint || 'Campo de entrada',
    accessibilityRole: 'none',
    accessible: true,
    aria_required: required,
  };
}

/**
 * 📌 Props estándar para imágenes accesibles
 */
export function getImageAccessibilityProps(description) {
  return {
    accessibilityLabel: description || 'Imagen',
    accessibilityRole: 'image',
    accessible: true,
  };
}

/**
 * 📌 Formato accesible para números y datos
 */
export function formatAccessibleNumber(num) {
  if (!num && num !== 0) return 'desconocido';
  return new Intl.NumberFormat('es-MX').format(num);
}

/**
 * 📌 Formato accesible para fechas
 */
export function formatAccessibleDate(date) {
  if (!date) return 'fecha desconocida';
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('es-MX', options).format(new Date(date));
}

/**
 * 📌 Anunciar cambios importantes para lectores de pantalla
 */
export function announceForAccessibility(message) {
  // En React Native, usamos AccessibilityInfo
  // En web, usaríamos aria-live regions
  if (typeof AccessibilityInfo !== 'undefined') {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * 📌 Validar contraste de colores (WCAG)
 */
export function getContrastedColor(foreground, background) {
  // Función auxiliar para calcular luminancia relativa
  function getLuminance(color) {
    const rgb = parseInt(color.replace('#', ''), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(x => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 📌 Validar si el contraste cumple con WCAG
 * AA: 4.5:1 para texto normal, 3:1 para texto grande
 * AAA: 7:1 para texto normal, 4.5:1 para texto grande
 */
export function isWCAGCompliant(contrastRatio, level = 'AA', isLargeText = false) {
  const thresholds = {
    'AA': isLargeText ? 3 : 4.5,
    'AAA': isLargeText ? 4.5 : 7,
  };
  
  return contrastRatio >= thresholds[level];
}

/**
 * 📌 Plantilla para componentes accesibles
 */
export const AccessibleComponentTemplate = {
  /**
   * Para un CustomButton accesible
   */
  button: `
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Etiqueta del botón"
      accessibilityHint="Descripción opcional"
      accessibilityRole="button"
      accessible={true}
      onAccessibilityTap={onPress}
    >
      {/* Contenido */}
    </TouchableOpacity>
  `,
  
  /**
   * Para un CustomInput accesible
   */
  textInput: `
    <TextInput
      placeholder="..."
      accessibilityLabel="Nombre del campo"
      accessibilityHint="Instrucciones de entrada"
      accessible={true}
      testID="test-input"
    />
  `,
};

/**
 * 📌 Mapa de áreas comunes que necesitan accesibilidad
 */
export const AccessibilityAreas = {
  FORM_INPUTS: ['Input', 'Select', 'Checkbox', 'Radio'],
  NAVIGATION: ['Button', 'Link', 'Tab'],
  DATA_DISPLAY: ['Table', 'List', 'Avatar', 'Image'],
  FEEDBACK: ['Alert', 'Toast', 'Modal', 'Loading'],
  INTERACTIVE: ['Slider', 'Picker', 'Switch', 'Stepper'],
};

export default {
  AccessibilityRoles,
  getTaskAccessibilityLabel,
  getUserAccessibilityLabel,
  getSyncStatusLabel,
  AccessibilityHints,
  getButtonAccessibilityProps,
  getInputAccessibilityProps,
  getImageAccessibilityProps,
  formatAccessibleNumber,
  formatAccessibleDate,
  announceForAccessibility,
  getContrastedColor,
  isWCAGCompliant,
  AccessibleComponentTemplate,
  AccessibilityAreas,
};
