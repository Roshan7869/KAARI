/**
 * Email Template Sanitization Utilities
 *
 * SECURITY: Prevents XSS and injection attacks in email templates
 * - Escapes HTML special characters in user-provided content
 * - Validates and sanitizes URLs
 * - Limits input lengths to prevent abuse
 */

/**
 * Escape HTML special characters to prevent XSS in email templates
 * This is critical for user-provided content that appears in emails
 *
 * @param text - Raw text that may contain HTML characters
 * @returns Sanitized text safe for HTML email rendering
 */
export function escapeHtml(text: string | undefined | null): string {
  if (text == null) return '';

  return text
    .replace(/&/g, '&amp;')   // Must be first to avoid double-escaping
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');  // Escape forward slashes for extra safety
}

/**
 * Escape HTML for use in HTML attributes (more aggressive)
 * Used when text is placed inside HTML tag attributes
 *
 * @param text - Raw text for attribute values
 * @returns Sanitized text safe for HTML attributes
 */
export function escapeHtmlAttribute(text: string | undefined | null): string {
  if (text == null) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/[\r\n]/g, ' ')  // Remove line breaks in attributes
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Validate and sanitize a URL for use in email href attributes
 * Only allows http/https protocols to prevent javascript: and data: URLs
 *
 * @param url - URL to validate
 * @param allowedDomains - Optional array of allowed domains (e.g., ['kaari.shop'])
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeEmailUrl(
  url: string | undefined | null,
  allowedDomains?: string[]
): string {
  if (!url) return '';

  try {
    // Handle relative URLs
    if (url.startsWith('/')) {
      // Relative URLs are allowed (will be relative to the email's base)
      return url;
    }

    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.warn('Email URL blocked: invalid protocol', { protocol: parsedUrl.protocol });
      return '';
    }

    // If allowedDomains is specified, validate the domain
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => {
        const lowerDomain = domain.toLowerCase();
        // Allow subdomains (e.g., shop.kaari.shop for kaari.shop)
        return hostname === lowerDomain || hostname.endsWith('.' + lowerDomain);
      });

      if (!isAllowed) {
        console.warn('Email URL blocked: domain not allowed', { hostname, allowedDomains });
        return '';
      }
    }

    return url;
  } catch (error) {
    console.warn('Email URL blocked: invalid URL', { url, error });
    return '';
  }
}

/**
 * Sanitize email address
 * Validates format and removes dangerous characters
 *
 * @param email - Email address to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return '';

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Remove any whitespace
  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    console.warn('Invalid email format blocked', { email: trimmed });
    return '';
  }

  // Additional safety: remove any HTML-like characters
  if (/[<>]/.test(trimmed)) {
    console.warn('Email with HTML characters blocked', { email: trimmed });
    return '';
  }

  return trimmed;
}

/**
 * Sanitize phone number for display
 * Removes dangerous characters and formats for display
 *
 * @param phone - Phone number string
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone) return '';

  // Only allow digits, spaces, hyphens, parentheses, and plus sign
  const cleaned = phone.replace(/[^\d\s\-()+]/g, '');

  // Limit length
  if (cleaned.length > 20) {
    return cleaned.substring(0, 20);
  }

  return cleaned;
}

/**
 * Sanitize order number / transaction ID
 * Only allows alphanumeric characters and hyphens
 *
 * @param id - Order number or transaction ID
 * @returns Sanitized identifier
 */
export function sanitizeOrderId(id: string | undefined | null): string {
  if (!id) return '';

  // Only allow alphanumeric, hyphens, and underscores
  const cleaned = id.replace(/[^a-zA-Z0-9\-_]/g, '');

  // Limit length (order numbers are typically short)
  if (cleaned.length > 50) {
    return cleaned.substring(0, 50);
  }

  return cleaned;
}

/**
 * Sanitize currency amount for display
 * Validates it's a valid number and formats safely
 *
 * @param amount - Currency amount
 * @returns Formatted currency string
 */
export function sanitizeCurrency(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '0';

  // Ensure non-negative
  const safeAmount = Math.max(0, amount);

  // Format as INR (Indian Rupees)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

/**
 * Sanitize tracking number (for shipping carriers)
 * Allows alphanumeric, spaces, and common tracking number characters
 *
 * @param trackingNumber - Carrier tracking number
 * @returns Sanitized tracking number
 */
export function sanitizeTrackingNumber(trackingNumber: string | undefined | null): string {
  if (!trackingNumber) return '';

  // Allow alphanumeric, spaces, and hyphens
  const cleaned = trackingNumber.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();

  // Limit length
  if (cleaned.length > 100) {
    return cleaned.substring(0, 100);
  }

  return cleaned;
}

/**
 * Sanitize carrier name
 * Only allows alphabetic characters and spaces
 *
 * @param carrier - Carrier name (e.g., 'Delhivery', 'BlueDart')
 * @returns Sanitized carrier name
 */
export function sanitizeCarrierName(carrier: string | undefined | null): string {
  if (!carrier) return '';

  // Only allow letters and spaces
  const cleaned = carrier.replace(/[^a-zA-Z\s]/g, '').trim();

  // Limit length
  if (cleaned.length > 50) {
    return cleaned.substring(0, 50);
  }

  return cleaned;
}

/**
 * Sanitize address line
 * Escapes HTML while preserving normal address characters
 *
 * @param addressLine - Address line string
 * @returns Sanitized address line
 */
export function sanitizeAddressLine(addressLine: string | undefined | null): string {
  if (!addressLine) return '';

  // Escape HTML characters
  return escapeHtml(addressLine.trim());
}

/**
 * Sanitize customer name
 * Escapes HTML while preserving normal name characters
 *
 * @param name - Customer name
 * @returns Sanitized name
 */
export function sanitizeCustomerName(name: string | undefined | null): string {
  if (!name) return '';

  // Escape HTML characters
  return escapeHtml(name.trim());
}

/**
 * Sanitize product name or item description
 * Escapes HTML while preserving normal text
 *
 * @param text - Product name or description
 * @returns Sanitized text
 */
export function sanitizeProductText(text: string | undefined | null): string {
  if (!text) return '';

  // Escape HTML characters
  return escapeHtml(text.trim());
}

/**
 * Sanitize error/failure message
 * Removes potentially dangerous content while preserving useful info
 *
 * @param message - Error message from payment gateway
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string | undefined | null): string {
  if (!message) return 'An error occurred. Please try again.';

  // Remove any HTML and escape remaining characters
  const cleaned = message
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .trim();

  // Limit length
  if (cleaned.length > 200) {
    return escapeHtml(cleaned.substring(0, 200) + '...');
  }

  return escapeHtml(cleaned);
}

/**
 * Allowed domains for email links
 * These are the only domains that can appear in email href attributes
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'kaari.shop',
  'localhost', // For development
];

/**
 * Validate all URLs in email data
 * Returns sanitized URLs or empty strings for invalid URLs
 */
export function sanitizeEmailUrls(urls: {
  orderUrl?: string;
  trackingUrl?: string;
  retryUrl?: string;
  supportUrl?: string;
  shopUrl?: string;
}): Record<string, string> {
  const result: Record<string, string> = {};

  if (urls.orderUrl) {
    result.orderUrl = sanitizeEmailUrl(urls.orderUrl, ALLOWED_EMAIL_DOMAINS);
  }

  if (urls.trackingUrl) {
    // Tracking URLs may be external (carrier websites), so don't restrict domain
    result.trackingUrl = sanitizeEmailUrl(urls.trackingUrl);
  }

  if (urls.retryUrl) {
    result.retryUrl = sanitizeEmailUrl(urls.retryUrl, ALLOWED_EMAIL_DOMAINS);
  }

  if (urls.supportUrl) {
    result.supportUrl = sanitizeEmailUrl(urls.supportUrl, ALLOWED_EMAIL_DOMAINS);
  }

  if (urls.shopUrl) {
    result.shopUrl = sanitizeEmailUrl(urls.shopUrl, ALLOWED_EMAIL_DOMAINS);
  }

  return result;
}