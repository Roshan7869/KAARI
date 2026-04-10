import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { sanitizeFilePath } from '@/lib/sanitization';

const STORAGE_BUCKET = 'product-media';

function hasFileExtension(path: string) {
  return /\.[a-z0-9]+$/i.test(path);
}

export function resolveProductImageUrl(filePath?: string | null): string {
  if (!filePath) return '/placeholder.svg';

  // Strip CRLF, null bytes, and leading/trailing whitespace
  filePath = sanitizeFilePath(filePath);
  if (!filePath) return '/placeholder.svg';

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Also sanitize full URLs stored in DB (strip any embedded CRLF)
    return filePath.replace(/[\r\n\t\0]+/g, '').trim();
  }

  // Cloudinary public IDs have no file extension; Supabase Storage paths do
  if (!hasFileExtension(filePath)) {
    return getCloudinaryImageUrl(filePath, {
      width: 1200,
      height: 1200,
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
