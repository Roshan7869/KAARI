/**
 * Unit Tests for lib/utils.ts
 *
 * Tests for utility functions.
 * Target coverage: 80%
 */
import { describe, it, expect } from 'vitest';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('handles undefined and null values', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('handles object syntax', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn({ foo: true, bar: false })).toBe('foo');
    });

    it('handles array syntax', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('deduplicates Tailwind classes', async () => {
      const { cn } = await import('@/lib/utils');

      // twMerge should deduplicate conflicting Tailwind classes
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('merges non-conflicting Tailwind classes', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn('p-4', 'm-4')).toBe('p-4 m-4');
    });

    it('handles complex Tailwind merge scenarios', async () => {
      const { cn } = await import('@/lib/utils');

      // Later class should win in conflict
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles empty input', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn()).toBe('');
    });

    it('handles mixed inputs', async () => {
      const { cn } = await import('@/lib/utils');

      expect(cn(
        'base-class',
        { 'conditional-class': true, 'disabled-class': false },
        ['array-class'],
        false && 'false-class',
        'final-class'
      )).toBe('base-class conditional-class array-class final-class');
    });
  });
});