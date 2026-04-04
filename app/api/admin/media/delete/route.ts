import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteCloudinaryAsset } from '@/lib/cloudinary';
import { z } from 'zod';

const schema = z.object({
  mediaId: z.string().uuid('mediaId must be a valid UUID'),
  publicId: z.string().min(1).optional(), // fallback if not stored in DB
});

/**
 * DELETE /api/admin/media/delete
 * Deletes a product media record from Cloudinary + Supabase DB.
 * Admin-only — checks user role before proceeding.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();

  // ── Auth: admin only ──────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse request body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { mediaId, publicId: fallbackPublicId } = parsed.data;

  // ── Fetch media record from DB ────────────────────────────────────────
  const { data: media, error: fetchError } = await supabase
    .from('product_media')
    .select('id, file_path')
    .eq('id', mediaId)
    .single();

  if (fetchError || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // ── Determine public_id for Cloudinary ────────────────────────────────
  // If file_path has no extension and doesn't start with http, it's a Cloudinary public_id
  const filePath = media.file_path as string | null;
  const isCloudinaryPath = filePath && !filePath.startsWith('http') && !/\.[a-z0-9]+$/i.test(filePath);
  const publicId = isCloudinaryPath ? filePath : fallbackPublicId;

  let cloudinaryDeleted = false;
  if (publicId) {
    cloudinaryDeleted = await deleteCloudinaryAsset(publicId);
  }

  // ── Delete DB record ──────────────────────────────────────────────────
  const { error: deleteError } = await supabase
    .from('product_media')
    .delete()
    .eq('id', mediaId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, cloudinaryDeleted });
}
