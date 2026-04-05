import { test, expect, describe } from 'vitest';
import { sanitizeTextInput, sanitizeSearchQuery, validateEmail, validatePhone } from '@/lib/sanitization';

describe('Sanitization Utilities', () => {
  describe('sanitizeTextInput', () => {
    test('removes HTML tags', () => {
      expect(sanitizeTextInput('<script>alert("xss")</script>')).not.toContain('<');
    });

    test('escapes special characters', () => {
      expect(sanitizeTextInput('Test & "quoted"')).toBe('Test &amp; &quot;quoted&quot;');
    });

    test('respects max length', () => {
      const result = sanitizeTextInput('a'.repeat(300), 100);
      expect(result).toHaveLength(100);
    });

    test('trims whitespace', () => {
      expect(sanitizeTextInput('  hello  ')).toBe('hello');
    });
  });

  describe('validateEmail', () => {
    test('validates correct emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('validates 10-digit phone numbers', () => {
      expect(validatePhone('9876543210')).toBe(true);
      expect(validatePhone('+91 9876543210')).toBe(true);
      expect(validatePhone('+1-987-654-3210')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abcdefghij')).toBe(false);
    });
  });
});
