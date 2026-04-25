import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { sanitizeFilePath } from '@/lib/sanitization';

const STORAGE_BUCKET = 'product-media';

export type ImageSize = 'thumbnail' | 'medium' | 'large';

const SIZE_MAP: Record<ImageSize, { width: number; height: number }> = {
  thumbnail: { width: 200, height: 200 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
};

function hasFileExtension(path: string) {
  return /\.[a-z0-9]+$/i.test(path);
}

export function resolveProductImageUrl(filePath?: string | null, size: ImageSize = 'large'): string {
  if (!filePath) return '/placeholder.svg';

  // Strip CRLF, null bytes, and leading/trailing whitespace
  filePath = sanitizeFilePath(filePath);
  if (!filePath) return '/placeholder.svg';

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Also sanitize full URLs stored in DB (strip any embedded CRLF)
    return filePath.replace(/[\r\n\t\0]+/g, '').trim();
  }

  // Local static assets in /public — return as-is for Next.js Image optimization
  // Only serve local images that exist (e.g. /images/logo.svg, /og-image.svg).
  // Product media paths like /images/products/... are stored in Supabase/Cloudinary
  // in production and won't exist locally in dev — fall back to placeholder.
  if (filePath.startsWith('/images/')) {
    if (filePath.startsWith('/images/products/')) {
      return '/placeholder.svg';
    }
    return filePath;
  }

  // Cloudinary public IDs have no file extension; Supabase Storage paths do
  if (!hasFileExtension(filePath)) {
    const { width, height } = SIZE_MAP[size];
    return getCloudinaryImageUrl(filePath, {
      width,
      height,
      quality: 'auto',
      format: 'auto',
    });
  }

  // Trim env var — protects against trailing CRLF in .env values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/[\r\n]+$/, '');
  if (!supabaseUrl) return '/placeholder.svg';

  const normalizedPath = filePath.startsWith(`${STORAGE_BUCKET}/`)
    ? filePath.slice(STORAGE_BUCKET.length + 1)
    : filePath;

  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${normalizedPath}`;
}
