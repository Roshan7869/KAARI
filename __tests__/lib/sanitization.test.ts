import { describe, expect, it } from 'vitest';
import {
  sanitizeSearchQuery,
  sanitizeTextInput,
  sanitizeUrl,
  validateEmail,
  validatePhone,
} from '@/lib/sanitization';

describe('sanitization', () => {
  it('removes script-like characters from text input', () => {
    const value = `<script>alert('xss')</script>`;
    const sanitized = sanitizeTextInput(value);
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
  });

  it('escapes SQL wildcard chars in search query', () => {
    const value = 'bag_100% cotton';
    expect(sanitizeSearchQuery(value)).toContain('\\_100\\%');
  });

  it('validates email and phone formats', () => {
    expect(validateEmail('team@kaari.in')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validatePhone('+91 9876543210')).toBe(true);
    expect(validatePhone('123')).toBe(false);
  });

  it('rejects javascript urls', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('https://kaari.in')).toBe('https://kaari.in');
  });
});
