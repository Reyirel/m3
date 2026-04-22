/**
 * hooks/useFormValidation.js
 * React hook for form validation using ValidationRules
 * Replaces scattered validation logic across screens
 */

import { useState, useCallback, useMemo } from 'react';
import { validateFormAgainstSchema } from '../utils/ValidationRules';

/**
 * useFormValidation hook
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationSchema - Schema with validation rules
 * @param {Function} onSubmit - Callback when form is valid
 * @returns {Object} Form state and handlers
 */
export function useFormValidation(initialValues = {}, validationSchema = {}, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  /**
   * Validate single field
   */
  const validateField = useCallback((fieldName, value) => {
    if (!validationSchema[fieldName]) {
      return null;
    }

    const ruleFn = validationSchema[fieldName];
    const result = ruleFn(value);

    return result.error || null;
  }, [validationSchema]);

  /**
   * Validate all fields
   */
  const validateForm = useCallback((formValues = null) => {
    const data = formValues || values;
    const result = validateFormAgainstSchema(data, validationSchema);

    setErrors(result.errors);
    return result.valid;
  }, [values, validationSchema]);

  /**
   * Handle field change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear error if field was touched and now has value
    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors(prev => ({
        ...prev,
        [name]: error ? { [name]: [error] } : undefined,
      }));
    }
  }, [touched, validateField]);

  /**
   * Handle field blur
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));

    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [name]: { [name]: [error] },
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validateField]);

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    setSubmitError(null);
    const isValid = validateForm();

    if (!isValid) {
      return false;
    }

    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit(values);
        return true;
      } catch (error) {
        setSubmitError(error.message || 'Error al enviar formulario');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    }

    return true;
  }, [values, validateForm, onSubmit]);

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  /**
   * Set field error programmatically
   */
  const setFieldError = useCallback((fieldName, error) => {
    if (error) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: { [fieldName]: [error] },
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, []);

  /**
   * Reset form to initial values
   */
  const handleReset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  /**
   * Get field props (for binding to input)
   */
  const getFieldProps = useCallback((fieldName) => ({
    name: fieldName,
    value: values[fieldName] || '',
    onChange: handleChange,
    onBlur: handleBlur,
  }), [values, handleChange, handleBlur]);

  /**
   * Get field error
   */
  const getFieldError = useCallback((fieldName) => {
    return errors[fieldName]?.[fieldName]?.[0] || null;
  }, [errors]);

  /**
   * Check if field is touched and has error
   */
  const hasFieldError = useCallback((fieldName) => {
    return touched[fieldName] && !!getFieldError(fieldName);
  }, [touched, getFieldError]);

  /**
   * Memoize form state object
   */
  const formState = useMemo(() => ({
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isValid: Object.keys(errors).length === 0,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
  }), [values, errors, touched, isSubmitting, submitError, initialValues]);

  return {
    // Form values
    values,
    setFieldValue,

    // Form errors
    errors,
    setFieldError,
    getFieldError,
    hasFieldError,

    // Form handlers
    handleChange,
    handleBlur,
    handleSubmit,
    handleReset,
    getFieldProps,

    // Form validation
    validateForm,
    validateField,

    // Form state
    ...formState,
  };
}

/**
 * Hook for validating a single value
 * Useful for real-time validation on specific fields
 */
export function useFieldValidation(initialValue = '', validationRule) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((val) => {
    if (validationRule) {
      const result = validationRule(val);
      setError(result.error);
      return result.valid;
    }
    return true;
  }, [validationRule]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(value);
  }, [value, validate]);

  const handleFocus = useCallback(() => {
    setTouched(true);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  const handleClear = useCallback(() => {
    setValue('');
    setError(null);
  }, []);

  return {
    value,
    setValue,
    handleChange,
    handleBlur,
    handleFocus,
    error,
    setError,
    touched,
    setTouched,
    reset,
    handleClear,
    isValid: !error && touched,
    hasError: touched && !!error,
  };
}

/**
 * Hook for async form validation (e.g., checking email uniqueness)
 */
export function useAsyncFieldValidation(initialValue = '', asyncValidationRule) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(async (val) => {
    if (!asyncValidationRule) return true;

    setIsValidating(true);
    try {
      const result = await asyncValidationRule(val);
      setError(result.error || null);
      setIsValidating(false);
      return !result.error;
    } catch (err) {
      setError(err.message);
      setIsValidating(false);
      return false;
    }
  }, [asyncValidationRule]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(value);
  }, [value, validate]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
    setIsValidating(false);
  }, [initialValue]);

  return {
    value,
    setValue,
    handleChange,
    handleBlur,
    error,
    setError,
    touched,
    isValidating,
    reset,
    isValid: !error && touched,
    hasError: touched && !!error,
  };
}
