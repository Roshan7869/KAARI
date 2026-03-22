/**
 * Input Sanitization Utility
 * Prevents XSS attacks and dangerous input values
 */

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
 * Validate phone number (basic - Indian format focused)
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone is valid
 */
export function validatePhone(phone: string): boolean {
  // Basic validation for Indian phone numbers and international formats
  const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\d{10}$/;
  return phoneRegex.test(phone.replace(/[\s\-().]/g, ''));
}

/**
 * Sanitize URL to prevent XSS via data URIs
 * @param url - URL to sanitize
 * @returns Safe URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If it's a relative URL
    if (!url.startsWith('javascript:') && !url.startsWith('data:')) {
      return url;
    }
    return '';
  }
}
