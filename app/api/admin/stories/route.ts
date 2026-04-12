import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteCloudinaryAsset } from '@/lib/cloudinary-server';
import { revalidatePath } from 'next/cache';

// ── Auth helper ─────────────────────────────────────────────────────
async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { error: null };
}

// ── GET — list all stories (admin view, includes inactive) ──────────
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('instagram_stories')
    .select('*')
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stories: data });
}

// ── POST — upload new story image ───────────────────────────────────
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const formData = await request.formData();
  const file     = formData.get('file') as File | null;
  const caption  = (formData.get('caption') as string | null) || null;
  const link_url = (formData.get('link_url') as string | null) || null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
  }

  const cloudName  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey     = (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY)?.trim();
  const apiSecret  = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary credentials not configured' }, { status: 500 });
  }

  try {
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cld } = require('cloudinary');
    cld.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cld.uploader
          .upload_stream(
            {
              folder:        'kaari/stories',
              resource_type: 'image',
              transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
                { quality: 'auto', fetch_format: 'auto' },
              ],
              tags: ['kaari', 'story'],
            },
            (err: Error | null, result: { secure_url: string; public_id: string } | undefined) => {
              if (err) reject(err);
              else resolve(result!);
            }
          )
          .end(buffer);
      }
    );

    const admin = createAdminClient();

    // Get current max position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxPos } = await (admin as any)
      .from('instagram_stories')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = ((maxPos as { position: number } | null)?.position ?? -1) + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: story, error: dbError } = await (admin as any)
      .from('instagram_stories')
      .insert({
        image_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        caption,
        link_url,
        position:  nextPosition,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    revalidatePath('/');
    return NextResponse.json({ story }, { status: 201 });

  } catch (err: unknown) {
    console.error('[Stories] Upload failed:', err);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ── PATCH — update caption, link_url, position, or is_active ───────
export async function PATCH(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await request.json() as {
    id: string;
    position?: number;
    is_active?: boolean;
    caption?: string | null;
    link_url?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.position  !== undefined) updates.position  = body.position;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.caption   !== undefined) updates.caption   = body.caption;
  if (body.link_url  !== undefined) updates.link_url  = body.link_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('instagram_stories')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/');
  return NextResponse.json({ story: data });
}

// ── DELETE — remove story + its Cloudinary asset ────────────────────
export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: story, error: fetchError } = await (admin as any)
    .from('instagram_stories')
    .select('public_id')
    .eq('id', id)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Delete from Cloudinary (non-fatal if it fails)
  await deleteCloudinaryAsset((story as { public_id: string }).public_id).catch((err: unknown) => {
    console.warn('[Stories] Cloudinary delete warning:', err);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (admin as any)
    .from('instagram_stories')
    .delete()
    .eq('id', id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  revalidatePath('/');
  return NextResponse.json({ success: true });
}
