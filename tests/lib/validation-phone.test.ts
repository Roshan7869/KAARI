import { describe, it, expect } from 'vitest';
import { INDIAN_PHONE_REGEX, PHONE_ERROR_MSG, validateIndianPhone } from '@/lib/validation/phone';

describe('INDIAN_PHONE_REGEX', () => {
  it('matches valid Indian mobile numbers', () => {
    expect(INDIAN_PHONE_REGEX.test('9876543210')).toBe(true);
    expect(INDIAN_PHONE_REGEX.test('6123456789')).toBe(true);
    expect(INDIAN_PHONE_REGEX.test('7890123456')).toBe(true);
    expect(INDIAN_PHONE_REGEX.test('8123456789')).toBe(true);
  });

  it('rejects numbers starting with 0-5', () => {
    expect(INDIAN_PHONE_REGEX.test('5876543210')).toBe(false);
    expect(INDIAN_PHONE_REGEX.test('0123456789')).toBe(false);
  });

  it('rejects short numbers', () => {
    expect(INDIAN_PHONE_REGEX.test('98765432')).toBe(false);
  });

  it('rejects long numbers', () => {
    expect(INDIAN_PHONE_REGEX.test('98765432100')).toBe(false);
  });

  it('rejects non-numeric', () => {
    expect(INDIAN_PHONE_REGEX.test('98765abc10')).toBe(false);
  });
});

describe('validateIndianPhone', () => {
  it('returns true for valid numbers', () => {
    expect(validateIndianPhone('9876543210')).toBe(true);
  });

  it('returns false for invalid numbers', () => {
    expect(validateIndianPhone('1234567890')).toBe(false);
  });
});

describe('PHONE_ERROR_MSG', () => {
  it('contains expected guidance text', () => {
    expect(PHONE_ERROR_MSG).toContain('10-digit');
    expect(PHONE_ERROR_MSG).toContain('Indian');
  });
});
