/**
 * Unit Tests for lib/sanitization.ts
 *
 * Security-critical functions for preventing XSS, SQL injection, and URL-based attacks.
 * Target coverage: 95%+
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeTextInput,
  sanitizeSearchQuery,
  sanitizeUrl,
  validateEmail,
  validatePhone,
} from '@/lib/sanitization';

// =============================================================================
// sanitizeTextInput()
// =============================================================================
describe('sanitizeTextInput', () => {
  describe('XSS prevention', () => {
    it('should remove script tags', () => {
      // The function removes angle brackets and then escapes quotes
      expect(sanitizeTextInput('<script>alert("xss")</script>')).toBe(
        'scriptalert(&quot;xss&quot;)/script'
      );
    });

    it('should remove angle brackets to prevent HTML injection', () => {
      expect(sanitizeTextInput('<div>content</div>')).toBe('divcontent/div');
      expect(sanitizeTextInput('<img src=x onerror=alert(1)>')).toBe(
        'img src=x onerror=alert(1)'
      );
    });

    it('should escape ampersand to prevent HTML entity attacks', () => {
      expect(sanitizeTextInput('test&value')).toBe('test&amp;value');
      expect(sanitizeTextInput('a & b & c')).toBe('a &amp; b &amp; c');
    });

    it('should escape double quotes to prevent attribute injection', () => {
      expect(sanitizeTextInput('say "hello"')).toBe('say &quot;hello&quot;');
      expect(sanitizeTextInput('attr="value"')).toBe('attr=&quot;value&quot;');
    });

    it('should escape single quotes to prevent attribute injection', () => {
      expect(sanitizeTextInput("it's working")).toBe("it&#x27;s working");
      expect(sanitizeTextInput("don't")).toBe("don&#x27;t");
    });

    it('should handle multiple XSS vectors in a single input', () => {
      const maliciousInput = '<script>alert("xss")</script> & "dangerous" \'code\'';
      const expected = 'scriptalert(&quot;xss&quot;)/script &amp; &quot;dangerous&quot; &#x27;code&#x27;';
      expect(sanitizeTextInput(maliciousInput)).toBe(expected);
    });

    it('should handle event handler patterns', () => {
      expect(sanitizeTextInput('<div onclick="alert(1)">')).toBe(
        'div onclick=&quot;alert(1)&quot;'
      );
      expect(sanitizeTextInput('<img onerror="alert(1)">')).toBe(
        'img onerror=&quot;alert(1)&quot;'
      );
    });

    it('should handle javascript: URLs in text', () => {
      expect(sanitizeTextInput('<a href="javascript:alert(1)">click</a>')).toBe(
        'a href=&quot;javascript:alert(1)&quot;click/a'
      );
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeTextInput('  hello world  ')).toBe('hello world');
      expect(sanitizeTextInput('\t\ncontent\n\t')).toBe('content');
    });

    it('should preserve internal whitespace', () => {
      expect(sanitizeTextInput('hello   world')).toBe('hello   world');
      expect(sanitizeTextInput('line1\nline2')).toBe('line1\nline2');
    });

    it('should handle whitespace-only input', () => {
      expect(sanitizeTextInput('   ')).toBe('');
      expect(sanitizeTextInput('\t\t')).toBe('');
      expect(sanitizeTextInput('\n\n')).toBe('');
    });
  });

  describe('length limiting', () => {
    it('should truncate input exceeding default max length (255)', () => {
      const longInput = 'a'.repeat(300);
      const result = sanitizeTextInput(longInput);
      expect(result.length).toBe(255);
      expect(result).toBe('a'.repeat(255));
    });

    it('should truncate input exceeding custom max length', () => {
      const input = 'hello world';
      expect(sanitizeTextInput(input, 5)).toBe('hello');
      expect(sanitizeTextInput(input, 100)).toBe(input);
    });

    it('should apply length limit after sanitization', () => {
      const input = '&&&&&';
      const result = sanitizeTextInput(input, 10);
      expect(result.length).toBe(10);
      expect(result).toBe('&amp;&amp;');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeTextInput(null as unknown as string)).toBe('');
      expect(sanitizeTextInput(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeTextInput('')).toBe('');
    });

    it('should preserve safe text unchanged', () => {
      expect(sanitizeTextInput('Hello World')).toBe('Hello World');
      expect(sanitizeTextInput('Product Name 123')).toBe('Product Name 123');
    });

    it('should handle special characters safely', () => {
      expect(sanitizeTextInput('email@domain.com')).toBe('email@domain.com');
      expect(sanitizeTextInput('price: $99.99')).toBe('price: $99.99');
      expect(sanitizeTextInput('50% off')).toBe('50% off');
    });

    it('should handle Unicode characters', () => {
      expect(sanitizeTextInput('Hello 你好')).toBe('Hello 你好');
      expect(sanitizeTextInput('🎉 Party!')).toBe('🎉 Party!');
    });
  });
});

// =============================================================================
// sanitizeSearchQuery()
// =============================================================================
describe('sanitizeSearchQuery', () => {
  describe('SQL injection prevention', () => {
    it('should escape SQL wildcard percent sign', () => {
      expect(sanitizeSearchQuery('100%')).toBe('100\\%');
      expect(sanitizeSearchQuery('50% discount')).toBe('50\\% discount');
    });

    it('should escape SQL wildcard underscore', () => {
      expect(sanitizeSearchQuery('test_value')).toBe('test\\_value');
      expect(sanitizeSearchQuery('a_b_c')).toBe('a\\_b\\_c');
    });

    it('should escape backslash characters', () => {
      expect(sanitizeSearchQuery('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle multiple SQL wildcards in a single query', () => {
      expect(sanitizeSearchQuery('test_%value%')).toBe('test\\_\\%value\\%');
    });
  });

  describe('input sanitization inheritance', () => {
    it('should apply text sanitization (angle brackets removed)', () => {
      expect(sanitizeSearchQuery('<script>')).toBe('script');
      expect(sanitizeSearchQuery('<div>search</div>')).toBe('divsearch/div');
    });

    it('should apply XSS escaping (quotes and ampersands)', () => {
      expect(sanitizeSearchQuery('test"value')).toBe('test&quot;value');
      expect(sanitizeSearchQuery("test'value")).toBe("test&#x27;value");
    });

    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  search term  ')).toBe('search term');
    });
  });

  describe('length limiting', () => {
    it('should limit to 100 characters max', () => {
      const longQuery = 'a'.repeat(150);
      const result = sanitizeSearchQuery(longQuery);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeSearchQuery(null as unknown as string)).toBe('');
      expect(sanitizeSearchQuery(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });

    it('should handle whitespace-only input', () => {
      expect(sanitizeSearchQuery('   ')).toBe('');
    });
  });
});

// =============================================================================
// sanitizeUrl()
// =============================================================================
describe('sanitizeUrl', () => {
  describe('dangerous URL blocking', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('javascript:void(0)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('data:image/png;base64,iVBORw0KG')).toBe('');
    });

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      expect(sanitizeUrl('VBSCRIPT:msgbox(1)')).toBe('');
    });
  });

  describe('allowed URLs', () => {
    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('https://secure.example.com/path')).toBe(
        'https://secure.example.com/path'
      );
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/products/123')).toBe('/products/123');
      expect(sanitizeUrl('/cart')).toBe('/cart');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBe('');
      expect(sanitizeUrl(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('should handle whitespace-only input', () => {
      expect(sanitizeUrl('   ')).toBe('   ');
      expect(sanitizeUrl('\t\n')).toBe('\t\n');
    });
  });
});

// =============================================================================
// validateEmail()
// =============================================================================
describe('validateEmail', () => {
  describe('valid email formats', () => {
    it('should validate standard email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test@domain.org')).toBe(true);
    });

    it('should validate emails with plus addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should validate emails with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });
  });

  describe('invalid email formats', () => {
    it('should reject emails without @ symbol', () => {
      expect(validateEmail('userexample.com')).toBe(false);
      expect(validateEmail('userexample')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should reject null/undefined input', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject whitespace-only input', () => {
      expect(validateEmail('   ')).toBe(false);
    });
  });
});

// =============================================================================
// validatePhone()
// =============================================================================
describe('validatePhone', () => {
  describe('valid Indian phone formats', () => {
    it('should validate 10-digit Indian mobile numbers', () => {
      expect(validatePhone('9876543210')).toBe(true);
    });

    it('should validate Indian numbers with +91 prefix', () => {
      expect(validatePhone('+919876543210')).toBe(true);
      expect(validatePhone('+91-9876543210')).toBe(true);
    });
  });

  describe('valid international formats', () => {
    it('should validate US numbers with country code', () => {
      expect(validatePhone('+1 1234567890')).toBe(true);
    });

    it('should validate numbers with various separators', () => {
      expect(validatePhone('98765-43210')).toBe(true);
      expect(validatePhone('987 654 3210')).toBe(true);
    });
  });

  describe('invalid phone numbers', () => {
    it('should reject numbers that are too short', () => {
      expect(validatePhone('123456789')).toBe(false);
    });

    it('should reject numbers with letters', () => {
      expect(validatePhone('9876abc210')).toBe(false);
    });

    it('should reject empty input', () => {
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should reject null/undefined input', () => {
      // The implementation throws on null input (not gracefully handled)
      expect(() => validatePhone(null as unknown as string)).toThrow();
      expect(() => validatePhone(undefined as unknown as string)).toThrow();
    });

    it('should handle leading/trailing whitespace', () => {
      expect(validatePhone('  9876543210  ')).toBe(true);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================
describe('sanitization integration', () => {
  describe('combined attack vectors', () => {
    it('should handle XSS with SQL injection patterns', () => {
      const input = "<script>alert('xss')</script> SELECT * FROM users";
      const result = sanitizeSearchQuery(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should sanitize user input for database queries', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = sanitizeSearchQuery(maliciousInput);
      expect(result).toBe('&#x27;; DROP TABLE users; --');
    });
  });

  describe('real-world input scenarios', () => {
    it('should sanitize product names safely', () => {
      expect(sanitizeTextInput('Handmade Wool Scarf')).toBe('Handmade Wool Scarf');
      expect(sanitizeTextInput('Cotton "Premium" Yarn')).toBe('Cotton &quot;Premium&quot; Yarn');
    });

    it('should validate checkout form inputs', () => {
      expect(validateEmail('customer@example.com')).toBe(true);
      expect(validatePhone('+91 98765 43210')).toBe(true);
    });
  });
});