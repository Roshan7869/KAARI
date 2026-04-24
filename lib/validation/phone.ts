/**
 * Shared phone validation for Indian mobile numbers.
 * Used by both client-side form schemas and server-side API routes
 * to ensure consistent validation behavior.
 */

/** Matches 10-digit Indian mobile numbers starting with 6-9 */
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const PHONE_ERROR_MSG =
  'Enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9)';

/**
 * Validate an Indian mobile number.
 * Accepts only 10-digit numbers starting with 6, 7, 8, or 9.
 */
export const validateIndianPhone = (phone: string): boolean =>
  INDIAN_PHONE_REGEX.test(phone);
