import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

const UpdateFeatureFlagSchema = z.object({
  id: z.string().uuid().optional(),
  flag_key: z.string().min(1).optional(),
  is_enabled: z.boolean(),
});

interface FeatureFlagRow {
  id: string;
  flag_key: string;
  flag_label: string;
  flag_group: string;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  updated_at: string | null;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('feature_flags' as any)
      .select('id, flag_key, flag_label, flag_group, is_enabled, config, updated_at')
      .order('flag_group')
      .order('flag_label');

    if (error) {
      logger.error('Failed to fetch feature flags', { error });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ flags: (data ?? []) as unknown as FeatureFlagRow[] });
  } catch (error) {
    logger.error('Admin features GET failed', { error: toMessage(error) });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const body = await request.json();
    const parsed = UpdateFeatureFlagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId } = await auth();
    const payload = parsed.data;
    const supabase = createAdminClient();

    const selector = payload.id ? { column: 'id', value: payload.id } : { column: 'flag_key', value: payload.flag_key ?? '' };
    if (!selector.value) {
      return NextResponse.json({ error: 'Either id or flag_key is required.' }, { status: 400 });
    }

    const { data: existingRaw, error: existingError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('feature_flags' as any)
      .select('id, flag_key, flag_label, is_enabled')
      .eq(selector.column, selector.value)
      .maybeSingle();

    const existing = existingRaw as unknown as { id: string; flag_key: string; flag_label: string; is_enabled: boolean } | null;

    if (existingError) {
      logger.error('Failed to load feature flag before update', { existingError });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Feature flag not found.' }, { status: 404 });
    }

    const { data: updatedRaw, error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('feature_flags' as any)
      .update({
        is_enabled: payload.is_enabled,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, flag_key, flag_label, flag_group, is_enabled, config, updated_at')
      .single();

    const updated = updatedRaw as unknown as FeatureFlagRow;

    if (updateError) {
      logger.error('Failed to update feature flag', { updateError, featureFlagId: existing.id });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('admin_activity_log' as any)
      .insert({
      admin_id: userId,
      action: 'UPDATE',
      entity_type: 'feature_flag',
      entity_id: existing.id,
      entity_label: existing.flag_key,
      before_state: { is_enabled: existing.is_enabled },
      after_state: { is_enabled: payload.is_enabled },
    });

    return NextResponse.json({ flag: updated as FeatureFlagRow });
  } catch (error) {
    logger.error('Admin features PATCH failed', { error: toMessage(error) });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
