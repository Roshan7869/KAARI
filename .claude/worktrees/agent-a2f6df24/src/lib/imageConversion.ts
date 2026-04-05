/**
 * Image Conversion Utility
 *
 * Handles image format conversion, resizing, and optimization
 * for product images and customization uploads.
 */

export interface ImageConversionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  preserveMetadata?: boolean;
}

export interface ConvertedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  size: number; // in bytes
}

const DEFAULT_OPTIONS: Required<ImageConversionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'image/webp',
  preserveMetadata: false,
};

/**
 * Convert an image file to a different format/size
 */
export async function convertImage(
  file: File,
  options: ImageConversionOptions = {}
): Promise<ConvertedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const result = processImage(img, opts);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Process image with resizing and format conversion
 */
function processImage(
  img: HTMLImageElement,
  opts: Required<ImageConversionOptions>
): ConvertedImage {
  // Calculate dimensions maintaining aspect ratio
  let { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  );

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            blob,
            dataUrl: reader.result as string,
            width,
            height,
            format: opts.format,
            size: blob.size,
          });
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
      },
      opts.format,
      opts.quality
    );
  }) as unknown as ConvertedImage;
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if needed
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
}

/**
 * Convert multiple images in batch
 */
export async function convertImagesBatch(
  files: File[],
  options: ImageConversionOptions = {},
  onProgress?: (progress: number) => void
): Promise<ConvertedImage[]> {
  const results: ConvertedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    results.push(await convertImage(files[i], options));
    if (onProgress) {
      onProgress((i + 1) / files.length);
    }
  }

  return results;
}

/**
 * Get image dimensions without full loading
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    minWidth?: number;
    minHeight?: number;
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    minWidth = 100,
    minHeight = 100,
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  // Note: Dimension validation requires async image loading
  // This is a basic synchronous validation
  return { valid: true };
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  file: File,
  size: number = 200
): Promise<ConvertedImage> {
  return convertImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    format: 'image/webp',
  });
}

/**
 * Convert HEIC/HEIF images (common on iOS) to JPEG/WebP
 * Note: Requires additional library for full HEIC support
 */
export async function convertHeicToWebp(file: File): Promise<ConvertedImage> {
  // Check if it's a HEIC file
  if (!file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
    // Not a HEIC file, just convert normally
    return convertImage(file, { format: 'image/webp' });
  }

  // For full HEIC support, you would need a library like heic2any
  // This is a placeholder that will throw for HEIC files
  throw new Error(
    'HEIC/HEIF images are not supported. Please convert to JPEG or PNG first.'
  );
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Get optimal format for the browser
 */
export function getOptimalFormat(): 'image/webp' | 'image/jpeg' {
  return supportsWebP() ? 'image/webp' : 'image/jpeg';
}

export default {
  convertImage,
  convertImagesBatch,
  getImageDimensions,
  validateImageFile,
  createThumbnail,
  convertHeicToWebp,
  formatFileSize,
  supportsWebP,
  getOptimalFormat,
};