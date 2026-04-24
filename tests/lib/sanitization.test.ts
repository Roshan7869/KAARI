import { describe, it, expect } from 'vitest';
import {
  sanitizeTextInput,
  sanitizeSearchQuery,
  sanitizeUrl,
  sanitizeFilePath,
  validateEmail,
  validatePhone,
} from '@/lib/sanitization';

describe('sanitizeTextInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeTextInput('  hello  ')).toBe('hello');
  });

  it('removes angle brackets', () => {
    expect(sanitizeTextInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('escapes ampersand', () => {
    expect(sanitizeTextInput('A & B')).toBe('A &amp; B');
  });

  it('escapes double quotes', () => {
    expect(sanitizeTextInput('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeTextInput("it's")).toBe('it&#x27;s');
  });

  it('enforces max length', () => {
    expect(sanitizeTextInput('a'.repeat(300), 10)).toBe('a'.repeat(10));
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeTextInput('')).toBe('');
  });
});

describe('sanitizeSearchQuery', () => {
  it('escapes SQL wildcards', () => {
    expect(sanitizeSearchQuery('%_\\')).toBe('\\%\\_\\\\');
  });

  it('trims and limits length', () => {
    expect(sanitizeSearchQuery('  hello%  ')).toBe('hello\\%');
  });
});

describe('sanitizeUrl', () => {
  it('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>')).toBe('');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows relative URLs', () => {
    expect(sanitizeUrl('/products/123')).toBe('/products/123');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
  });
});

describe('sanitizeFilePath', () => {
  it('removes null bytes and newlines', () => {
    expect(sanitizeFilePath('path\n\r\t\0to/file')).toBe('pathto/file');
  });

  it('collapses multiple slashes', () => {
    expect(sanitizeFilePath('path//to//file')).toBe('path/to/file');
  });

  it('trims whitespace', () => {
    expect(sanitizeFilePath('  path/to/file  ')).toBe('path/to/file');
  });
});

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects missing local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('accepts valid Indian mobile numbers', () => {
    expect(validatePhone('9876543210')).toBe(true);
    expect(validatePhone('6123456789')).toBe(true);
  });

  it('rejects numbers starting with 0-5', () => {
    expect(validatePhone('5876543210')).toBe(false);
  });

  it('rejects short numbers', () => {
    expect(validatePhone('98765432')).toBe(false);
  });

  it('rejects long numbers', () => {
    expect(validatePhone('98765432100')).toBe(false);
  });

  it('rejects non-numeric', () => {
    expect(validatePhone('98765abc10')).toBe(false);
  });
});
