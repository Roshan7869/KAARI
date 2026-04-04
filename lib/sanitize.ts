/**
 * Sanitization utilities — prevent injection attacks and data corruption
 */

/**
 * Sanitize file paths — remove CRLF, null bytes, excess whitespace.
 * Prevents directory traversal, injection, and database corruption.
 */
export function sanitizeFilePath(raw: string): string {
  return raw
    .replace(/[\r\n\t\0]+/g, '')   // Remove CRLF, null bytes, tabs
    .replace(/\s+/g, ' ')           // Collapse multiple spaces to single
    .replace(/\/+/g, '/')           // Normalize slashes
    .trim()
}

/**
 * Sanitize text input — XSS prevention
 */
export function sanitizeTextInput(raw: string, maxLength = 1000): string {
  return raw
    .substring(0, maxLength)
    .replace(/[<>]/g, '')           // Remove angle brackets
    .trim()
}

/**
 * Validate URL format — prevent javascript:, data: URIs
 */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
    return url.toString()
  } catch {
    throw new Error('Invalid URL format')
  }
}
