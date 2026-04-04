import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/media
 * Lists images from Cloudinary. Admin-only.
 * Query params: folder (prefix), next_cursor (pagination)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') || '';
  const nextCursor = searchParams.get('next_cursor') || undefined;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY)?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured on server' }, { status: 503 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cld } = require('cloudinary');
    cld.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const options: Record<string, unknown> = {
      resource_type: 'image',
      max_results: 50,
      ...(folder ? { prefix: folder } : {}),
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    };

    const result = await cld.api.resources(options);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Cloudinary] List resources error:', err);
    return NextResponse.json({ error: 'Failed to list Cloudinary resources' }, { status: 500 });
  }
}
