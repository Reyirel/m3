/**
 * Validación de esquemas de datos
 * Previene datos corruptos en Firestore
 */

// Esquemas de validación
const SCHEMAS = {
  task: {
    required: ['title', 'status', 'createdBy'],
    types: {
      title: 'string',
      // Incluye variantes usadas en distintas partes de la app
      status: ['pendiente', 'en_proceso', 'en_revision', 'cerrada', 'en_progreso', 'en-progreso', 'completada'],
      createdBy: 'string',
      priority: ['alta', 'media', 'baja'],
      dueAt: 'number',
      assignedTo: 'array', // Siempre array — TaskCreator normaliza a array
      area: 'string',
    }
  },
  report: {
    required: ['taskId', 'content', 'userId'],
    types: {
      taskId: 'string',
      content: 'string',
      userId: 'string',
      images: 'array',
      timestamp: 'number',
    }
  },
  subtask: {
    required: ['taskId', 'title', 'status'],
    types: {
      taskId: 'string',
      title: 'string',
      status: ['pendiente', 'completada'],
    }
  },
  user: {
    required: ['email', 'role'],
    types: {
      email: 'string',
      role: ['admin', 'secretario', 'director'],
      area: 'string',
    }
  }
};

/**
 * Validar un objeto contra un esquema
 * @param {object} data - Datos a validar
 * @param {string} schemaName - Nombre del esquema
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validateData = (data, schemaName) => {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    return { 
      valid: false, 
      errors: [`Schema "${schemaName}" not found`] 
    };
  }

  const errors = [];

  // Validar campos required
  schema.required?.forEach(field => {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Campo requerido faltante: "${field}"`);
    }
  });

  // Validar tipos
  Object.entries(schema.types || {}).forEach(([field, expectedType]) => {
    const value = data[field];
    
    if (value === undefined || value === null) return; // Skip optional fields

    // Validar enum (array de valores permitidos)
    if (Array.isArray(expectedType)) {
      if (!expectedType.includes(value)) {
        errors.push(`"${field}" debe ser uno de: ${expectedType.join(', ')}`);
      }
      return;
    }

    // Validar tipo
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== expectedType) {
      errors.push(`"${field}" debe ser tipo "${expectedType}", recibido "${actualType}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizar datos antes de guardar
 * @param {object} data - Datos a sanitizar
 * @param {string} schemaName - Nombre del esquema
 * @returns {object} Datos sanitizados
 */
export const sanitizeData = (data, schemaName) => {
  const schema = SCHEMAS[schemaName];
  if (!schema) return data;

  const sanitized = {};

  Object.entries(data).forEach(([key, value]) => {
    // Solo incluir campos definidos en el esquema
    if (schema.types[key] || schema.required?.includes(key)) {
      // Trimear strings
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
  });

  return sanitized;
};

/**
 * Validar y sanitizar en una sola operación
 * @param {object} data - Datos
 * @param {string} schemaName - Esquema
 * @returns {object} { valid, data, errors }
 */
export const validateAndSanitize = (data, schemaName) => {
  const validation = validateData(data, schemaName);
  const sanitized = sanitizeData(data, schemaName);

  return {
    valid: validation.valid,
    data: sanitized,
    errors: validation.errors
  };
};

export default {
  validateData,
  sanitizeData,
  validateAndSanitize,
  SCHEMAS
};
