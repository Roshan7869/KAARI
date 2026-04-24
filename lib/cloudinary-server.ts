import 'server-only';

/**
 * Server-side Cloudinary asset deletion.
 * IMPORTANT: Only call from API routes or Server Actions — requires CLOUDINARY_API_SECRET.
 * Uses signed requests via the Cloudinary Node.js SDK.
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  const cloudName  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey     = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY?.trim() || process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret  = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[Cloudinary] Missing credentials for server-side delete');
    return false;
  }

  try {
    // Dynamically import cloudinary Node SDK (server-side only, runtime dependency)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cld } = require('cloudinary');
    cld.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const result = await cld.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,   // purge from CDN cache immediately
    });

    return result.result === 'ok';
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', publicId, err);
    return false;
  }
}
