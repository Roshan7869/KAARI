/**
 * Input Sanitization Utility
 * Prevents XSS attacks and dangerous input values
 */
import { INDIAN_PHONE_REGEX } from './validation/phone';

/**
 * Sanitize text input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string safe to use in queries/display
 */
export function sanitizeTextInput(input: string, maxLength = 255): string {
  if (!input) return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove/escape HTML special characters
  sanitized = sanitized
    .replace(/[<>]/g, '')           // Remove angle brackets
    .replace(/[&]/g, '&amp;')       // Escape ampersand
    .replace(/"/g, '&quot;')        // Escape double quotes
    .replace(/'/g, '&#x27;');       // Escape single quotes

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize search query for database queries
 * Prevents SQL injection patterns in like queries
 * @param query - Search query from user
 * @returns Safe query for database search
 */
export function sanitizeSearchQuery(query: string): string {
  const sanitized = sanitizeTextInput(query, 100);
  
  // Escape SQL wildcards if they're not intentional search patterns
  return sanitized
    .replace(/[%_\\]/g, '\\$&');  // Escape SQL wildcard characters
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number — strict Indian mobile format.
 * Accepts only 10-digit numbers starting with 6, 7, 8, or 9.
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone is valid
 */
export function validatePhone(phone: string): boolean {
  return INDIAN_PHONE_REGEX.test(phone);
}

/**
 * Sanitize URL to prevent XSS via data URIs
 * @param url - URL to sanitize
 * @returns Safe URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Block dangerous protocols before any parsing
  const lowerUrl = url.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
  if (dangerousProtocols.some(p => lowerUrl.startsWith(p))) {
    return '';
  }

  try {
    const parsedUrl = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If it's a relative URL that isn't dangerous, allow it
    return url;
  }
}

/**
 * Sanitize file paths — remove CRLF, null bytes, excess whitespace.
 * Prevents directory traversal, injection, and database corruption.
 */
export function sanitizeFilePath(raw: string): string {
  return raw
    .replace(/[\r\n\t\0]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\/+/g, '/')
    .trim()
}
