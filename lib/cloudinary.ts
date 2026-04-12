/**
 * Cloudinary Configuration and Utilities
 *
 * Provides optimized image storage, transformations, and CDN delivery
 * Free tier: 25 credits/month (~25GB storage + transformations)
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: string;
}

interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at?: string;
}

// File upload constraints
const UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
} as const;

class CloudinaryService {
  private config: CloudinaryConfig;

  constructor(config: CloudinaryConfig) {
    this.config = config;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (file.size > UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds ${UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB limit. Max: 5MB`
      );
    }

    if (!UPLOAD_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')) {
      throw new Error(
        `Invalid file type. Allowed: JPEG, PNG, WebP, GIF. Got: ${file.type}`
      );
    }

    const filename = file.name.toLowerCase();
    const hasValidExt = UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.some((ext) =>
      filename.endsWith(ext)
    );
    if (!hasValidExt) {
      throw new Error(
        `Invalid file extension. Allowed: ${UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`
      );
    }
  }

  /**
   * Upload an image to Cloudinary
   */
  async uploadImage(
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Validate file before upload
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', this.config.apiKey);
    formData.append('timestamp', Date.now().toString());

    // Upload preset — reads from env, falls back to 'kaari_products'
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() || 'kaari_products';
    formData.append('upload_preset', uploadPreset);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.publicId) {
      formData.append('public_id', options.publicId);
    }

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Generate optimized image URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    } = {}
  ): string {
    const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = options;

    const transformations: string[] = [];

    if (width || height) {
      transformations.push(`w_${width || 'auto'},h_${height || 'auto'},c_${crop}`);
    }

    if (quality === 'auto') {
      transformations.push('q_auto');
    } else if (typeof quality === 'number') {
      transformations.push(`q_${quality}`);
    }

    if (format === 'auto') {
      transformations.push('f_auto');
    } else {
      transformations.push(`f_${format}`);
    }

    const transformationString = transformations.join(',');

    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformationString}/${publicId}`;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(publicId: string, size: number = 300): string {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'thumb',
      quality: 80,
    });
  }

  /**
   * Get full-size image URL
   */
  getFullSizeUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, {
      quality: 'auto',
      format: 'auto',
    });
  }
}

// Initialize Cloudinary service
export const cloudinary = new CloudinaryService({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || '',
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY?.trim() || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
});

// Helper function to get image URL from public_id
export function getCloudinaryImageUrl(
  publicId: string,
  options?: Parameters<typeof cloudinary.getOptimizedUrl>[1]
): string {
  if (!publicId) return '';

  // If it's already a full URL, return as-is
  if (publicId.startsWith('http')) {
    return publicId;
  }

  return cloudinary.getOptimizedUrl(publicId, options);
}

// Helper function for Next.js Image component
export function getCloudinaryImageProps(
  publicId: string,
  width: number,
  height: number
) {
  return {
    src: getCloudinaryImageUrl(publicId, { width, height }),
    width,
    height,
  };
}

export default cloudinary;

// Re-export for convenience
export { deleteCloudinaryAsset } from '@/lib/cloudinary-server';
