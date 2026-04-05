import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  publicIds: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * DELETE /api/admin/media/delete-asset
 * Deletes one or more images directly from Cloudinary (not from product_media table).
 * Use this from the media library. Admin-only.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Auth: use server client (reads cookies from request) — NOT admin client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Role check: use admin client for privileged DB access
  const adminSupabase = createAdminClient();
  const { data: roleData } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { publicIds } = parsed.data;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY)?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured on server' }, { status: 503 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cld } = require('cloudinary');
    cld.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const result = await cld.api.delete_resources(publicIds, {
      resource_type: 'image',
      invalidate: true,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[Cloudinary] Bulk delete error:', err);
    return NextResponse.json({ error: 'Failed to delete assets' }, { status: 500 });
  }
}
