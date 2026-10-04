/**
 * utils/ValidationRules.js
 * Centralized validation rules for forms across the application
 * Previously scattered across screens and services
 */

import { toMs } from './dateUtils';

/**
 * Validation rule definitions
 * Each rule is a function that returns { valid: boolean, error: string | null }
 */
export const ValidationRules = {
  /**
   * Task title validation
   */
  taskTitle: (value) => {
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Título requerido' };
    }
    if (value.trim().length < 3) {
      return { valid: false, error: 'Título debe tener al menos 3 caracteres' };
    }
    if (value.length > 100) {
      return { valid: false, error: 'Título no puede exceder 100 caracteres' };
    }
    return { valid: true, error: null };
  },

  /**
   * Task description validation
   */
  taskDescription: (value) => {
    if (value && typeof value !== 'string') {
      return { valid: false, error: 'Descripción debe ser texto' };
    }
    if (value && value.length > 2000) {
      return { valid: false, error: 'Descripción no puede exceder 2000 caracteres' };
    }
    return { valid: true, error: null };
  },

  /**
   * Priority validation
   */
  priority: (value) => {
    const validPriorities = ['alta', 'media', 'baja'];
    if (!validPriorities.includes(value)) {
      return {
        valid: false,
        error: `Prioridad debe ser una de: ${validPriorities.join(', ')}`
      };
    }
    return { valid: true, error: null };
  },

  /**
   * Due date validation
   */
  dueDate: (value) => {
    if (!value) return { valid: true, error: null };

    try {
      const dueDate = new Date(toMs(value));
      if (isNaN(dueDate.getTime())) {
        return { valid: false, error: 'Fecha de vencimiento inválida' };
      }
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: 'Fecha de vencimiento inválida' };
    }
  },

  /**
   * Estimated hours validation
   */
  estimatedHours: (value) => {
    if (!value) return { valid: true, error: null };
    if (typeof value !== 'number' || value <= 0) {
      return { valid: false, error: 'Horas estimadas debe ser un número positivo' };
    }
    if (value > 1000) {
      return { valid: false, error: 'Horas estimadas no puede ser mayor a 1000' };
    }
    return { valid: true, error: null };
  },

  /**
   * Email validation
   */
  email: (value) => {
    if (!value) return { valid: false, error: 'Email requerido' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Email inválido' };
    }
    return { valid: true, error: null };
  },

  /**
   * Area selection validation
   */
  area: (value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return { valid: false, error: 'Debe seleccionar al menos 1 área' };
    }
    return { valid: true, error: null };
  },

  /**
   * Assignees validation
   */
  assignees: (value) => {
    const assignees = Array.isArray(value) ? value : value ? [value] : [];
    if (assignees.length === 0) {
      return { valid: false, error: 'Debe asignar la tarea a al menos 1 persona' };
    }
    return { valid: true, error: null };
  },

  /**
   * Required field validation
   */
  required: (value, fieldName = 'Campo') => {
    if (!value) {
      return { valid: false, error: `${fieldName} requerido` };
    }
    return { valid: true, error: null };
  },

  /**
   * Text length validation
   */
  textLength: (value, minLength = 0, maxLength = 1000) => {
    if (!value) {
      return { valid: true, error: null };
    }
    const length = String(value).length;
    if (length < minLength) {
      return { valid: false, error: `Mínimo ${minLength} caracteres` };
    }
    if (length > maxLength) {
      return { valid: false, error: `Máximo ${maxLength} caracteres` };
    }
    return { valid: true, error: null };
  },

  /**
   * Number range validation
   */
  numberRange: (value, min = 0, max = 100) => {
    if (value === null || value === undefined || value === '') {
      return { valid: true, error: null };
    }
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Debe ser un número' };
    }
    if (num < min) {
      return { valid: false, error: `Mínimo ${min}` };
    }
    if (num > max) {
      return { valid: false, error: `Máximo ${max}` };
    }
    return { valid: true, error: null };
  },

  /**
   * Array/selection validation
   */
  selection: (value, minItems = 1) => {
    const items = Array.isArray(value) ? value : value ? [value] : [];
    if (items.length < minItems) {
      return { valid: false, error: `Seleccione al menos ${minItems} ${minItems === 1 ? 'opción' : 'opciones'}` };
    }
    return { valid: true, error: null };
  },

  /**
   * Date range validation
   */
  dateRange: (startValue, endValue) => {
    try {
      if (!startValue || !endValue) {
        return { valid: true, error: null };
      }

      const start = new Date(toMs(startValue));
      const end = new Date(toMs(endValue));

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Fechas inválidas' };
      }

      if (start > end) {
        return { valid: false, error: 'Fecha de inicio no puede ser posterior a la de fin' };
      }

      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: 'Error al validar rango de fechas' };
    }
  },
};

/**
 * Validator class for building complex validation chains
 */
export class Validator {
  constructor() {
    this.errors = [];
  }

  /**
   * Add a validation check
   */
  check(isValid, errorMessage) {
    if (!isValid) {
      this.errors.push(errorMessage);
    }
    return this;
  }

  /**
   * Apply a validation rule
   */
  applyRule(ruleFn, value, ...args) {
    const result = ruleFn(value, ...args);
    if (!result.valid && result.error) {
      this.errors.push(result.error);
    }
    return this;
  }

  /**
   * Check if all validations passed
   */
  isValid() {
    return this.errors.length === 0;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get first error message
   */
  getFirstError() {
    return this.errors[0] || null;
  }

  /**
   * Reset errors
   */
  reset() {
    this.errors = [];
    return this;
  }

  /**
   * Get validation result object
   */
  toResult() {
    return {
      valid: this.isValid(),
      errors: this.getErrors(),
    };
  }
}

