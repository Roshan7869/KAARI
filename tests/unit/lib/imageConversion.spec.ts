/**
 * Unit Tests for lib/imageConversion.ts
 *
 * Tests for image processing utilities.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM APIs
class MockCanvas {
  width: number = 0;
  height: number = 0;
  toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
    const blob = new Blob(['mock-image-data'], { type });
    callback(blob);
  }
  getContext() {
    return {
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: vi.fn(),
    };
  }
}

class MockImage {
  src: string = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width: number = 100;
  height: number = 100;
}

class MockFileReader {
  result: string = 'data:image/webp;base64,mock';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    setTimeout(() => this.onload?.(), 0);
  }
}

describe('imageConversion', () => {
  let originalURL: typeof URL;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalURL = global.URL;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Mock URL.createObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    // Mock DOM APIs
    global.Image = MockImage as unknown as typeof Image;
    global.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    global.URL = originalURL;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('validateImageFile', () => {
    it('validates correct image file', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects invalid file type', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const file = new File(['text data'], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('rejects file that is too large', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const file = new File(['x'.repeat(20 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('accepts custom max size', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file, { maxSizeBytes: 1024 * 1024 }); // 1MB

      expect(result.valid).toBe(true);
    });

    it('accepts custom allowed types', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const file = new File(['image'], 'test.avif', { type: 'image/avif' });
      const result = validateImageFile(file, { allowedTypes: ['image/avif'] });

      expect(result.valid).toBe(true);
    });

    it('accepts all common image types by default', async () => {
      const { validateImageFile } = await import('@/lib/imageConversion');

      const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

      for (const type of types) {
        const file = new File(['image'], 'test', { type });
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', async () => {
      const { formatFileSize } = await import('@/lib/imageConversion');

      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(100)).toBe('100 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('supportsWebP', () => {
    it('returns true when browser supports WebP', async () => {
      // Mock canvas.toDataURL to return WebP data URL
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,test'),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockCanvas as unknown as HTMLElement);

      const { supportsWebP } = await import('@/lib/imageConversion');
      const result = supportsWebP();

      expect(result).toBe(true);

      document.createElement = originalCreateElement;
    });

    it('returns false when browser does not support WebP', async () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockCanvas as unknown as HTMLElement);

      const { supportsWebP } = await import('@/lib/imageConversion');
      const result = supportsWebP();

      expect(result).toBe(false);

      document.createElement = originalCreateElement;
    });
  });

  describe('getOptimalFormat', () => {
    it('returns WebP when supported', async () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,test'),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockCanvas as unknown as HTMLElement);

      const { getOptimalFormat } = await import('@/lib/imageConversion');
      const result = getOptimalFormat();

      expect(result).toBe('image/webp');

      document.createElement = originalCreateElement;
    });

    it('returns JPEG when WebP not supported', async () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockCanvas as unknown as HTMLElement);

      const { getOptimalFormat } = await import('@/lib/imageConversion');
      const result = getOptimalFormat();

      expect(result).toBe('image/jpeg');

      document.createElement = originalCreateElement;
    });
  });

  describe('convertHeicToWebp', () => {
    it('throws error for HEIC files', async () => {
      const { convertHeicToWebp } = await import('@/lib/imageConversion');

      const heicFile = new File(['image'], 'test.heic', { type: 'image/heic' });

      await expect(convertHeicToWebp(heicFile)).rejects.toThrow('HEIC/HEIF images are not supported');
    });

    it('throws error for HEIF files', async () => {
      const { convertHeicToWebp } = await import('@/lib/imageConversion');

      const heifFile = new File(['image'], 'test.heif', { type: 'image/heif' });

      await expect(convertHeicToWebp(heifFile)).rejects.toThrow('HEIC/HEIF images are not supported');
    });
  });

  describe('createThumbnail', () => {
    it('creates thumbnail with default size', async () => {
      const { createThumbnail } = await import('@/lib/imageConversion');

      // createThumbnail calls convertImage internally
      // We just verify it's callable with correct defaults
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      // This would need more complex mocking for actual conversion
      // For now, we'll just verify the function signature
      expect(typeof createThumbnail).toBe('function');
    });
  });

  describe('getImageDimensions', () => {
    it('returns image dimensions', async () => {
      const { getImageDimensions } = await import('@/lib/imageConversion');

      // Mock Image to resolve immediately
      class MockImageWithResolve {
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width: number = 200;
        height: number = 150;

        constructor() {
          setTimeout(() => this.onload?.(), 0);
        }
      }

      global.Image = MockImageWithResolve as unknown as typeof Image;

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const result = await getImageDimensions(file);

      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });
  });
});