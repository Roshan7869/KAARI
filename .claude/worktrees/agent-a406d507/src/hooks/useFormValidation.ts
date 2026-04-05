/**
 * Form Validation Hook
 *
 * Provides input sanitization and validation for all forms.
 * Uses utilities from sanitization.ts to prevent XSS and injection attacks.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  sanitizeTextInput,
  sanitizeSearchQuery,
  validateEmail,
  validatePhone,
  sanitizeUrl,
} from '@/lib/sanitization';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldConfig {
  rules: ValidationRule;
  sanitize?: boolean;
  sanitizeMaxLength?: number;
}

export interface FormData {
  [key: string]: string;
}

export interface FormErrors {
  [key: string]: string | null;
}

export interface UseFormValidationOptions {
  initialData: FormData;
  fields: Record<string, FieldConfig>;
  onSubmit: (data: FormData) => Promise<void> | void;
}

export interface UseFormValidationReturn {
  data: FormData;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  setFieldError: (field: string, error: string | null) => void;
  clearErrors: () => void;
}

/**
 * Validate a single field based on its rules
 */
function validateField(value: string, rules: ValidationRule): string | null {
  // Required check
  if (rules.required && !value.trim()) {
    return 'This field is required';
  }

  // Skip other validations if empty and not required
  if (!value.trim()) {
    return null;
  }

  // Min length
  if (rules.minLength && value.length < rules.minLength) {
    return `Minimum ${rules.minLength} characters required`;
  }

  // Max length
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Maximum ${rules.maxLength} characters allowed`;
  }

  // Pattern match
  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

/**
 * Sanitize a value based on field config
 */
function sanitizeValue(value: string, config: FieldConfig): string {
  if (!config.sanitize) {
    return value;
  }

  const maxLength = config.sanitizeMaxLength ?? 255;

  // Use appropriate sanitizer based on field type
  // For now, default to text input sanitization
  return sanitizeTextInput(value, maxLength);
}

/**
 * Hook for form validation with sanitization
 *
 * @example
 * const { data, errors, handleChange, handleSubmit } = useFormValidation({
 *   initialData: { email: '', password: '' },
 *   fields: {
 *     email: {
 *       rules: { required: true },
 *       sanitize: true,
 *     },
 *     password: {
 *       rules: { required: true, minLength: 8 },
 *       sanitize: false, // Don't sanitize passwords
 *     },
 *   },
 *   onSubmit: async (data) => { ... },
 * });
 */
export function useFormValidation(options: UseFormValidationOptions): UseFormValidationReturn {
  const { initialData, fields, onSubmit } = options;

  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(fields).every((field) => {
      const config = fields[field];
      const value = data[field] || '';
      return validateField(value, config.rules) === null;
    });
  }, [data, fields]);

  // Handle field change with sanitization
  const handleChange = useCallback(
    (field: string, value: string): void => {
      const config = fields[field];

      // Sanitize input if configured
      const sanitizedValue = config ? sanitizeValue(value, config) : value;

      setData((prev) => ({ ...prev, [field]: sanitizedValue }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [fields, errors]
  );

  // Handle field blur for validation
  const handleBlur = useCallback(
    (field: string): void => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      const config = fields[field];
      if (!config) return;

      const value = data[field] || '';
      const error = validateField(value, config.rules);

      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [data, fields]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();

      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(fields).forEach((field) => {
        allTouched[field] = true;
      });
      setTouched(allTouched);

      // Validate all fields
      const newErrors: FormErrors = {};
      let hasErrors = false;

      Object.keys(fields).forEach((field) => {
        const config = fields[field];
        const value = data[field] || '';
        const error = validateField(value, config.rules);

        if (error) {
          newErrors[field] = error;
          hasErrors = true;
        }
      });

      setErrors(newErrors);

      if (hasErrors) {
        return;
      }

      // Submit with sanitized data
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, fields, onSubmit]
  );

  // Reset form to initial state
  const resetForm = useCallback((): void => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Set error for specific field
  const setFieldError = useCallback((field: string, error: string | null): void => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback((): void => {
    setErrors({});
  }, []);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldError,
    clearErrors,
  };
}

/**
 * Password validation rules
 */
export const passwordRules: ValidationRule = {
  required: true,
  minLength: 8,
  custom: (value: string): string | null => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
      return 'Password must contain a special character';
    return null;
  },
};

/**
 * Email validation rules
 */
export const emailRules: ValidationRule = {
  required: true,
  custom: (value: string): string | null => {
    if (!validateEmail(value)) return 'Invalid email address';
    return null;
  },
};

/**
 * Phone validation rules (Indian format focused)
 */
export const phoneRules: ValidationRule = {
  required: true,
  custom: (value: string): string | null => {
    if (!validatePhone(value)) return 'Invalid phone number';
    return null;
  },
};

/**
 * Name validation rules
 */
export const nameRules: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 100,
};

/**
 * Address validation rules
 */
export const addressRules: ValidationRule = {
  required: true,
  minLength: 5,
  maxLength: 500,
};

/**
 * PIN code validation rules (Indian 6-digit)
 */
export const pinCodeRules: ValidationRule = {
  required: true,
  pattern: /^[1-9][0-9]{5}$/,
  custom: (value: string): string | null => {
    if (!/^[1-9][0-9]{5}$/.test(value)) return 'Invalid PIN code (6 digits required)';
    return null;
  },
};

export default useFormValidation;