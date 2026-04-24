import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk webhook events to sync user data into Supabase profiles.
 * Clerk is the primary auth provider — this webhook is the ONLY way Clerk users
 * get a profiles row (the Supabase auth trigger only fires for direct Supabase signups).
 *
 * Supported events:
 *   - user.created  → upsert profile
 *   - user.updated  → update profile
 *   - user.deleted  → soft-delete profile (set deleted_at)
 *
 * Signature verification uses svix (Clerk's official library) which handles
 * signature versioning and replay protection.
 */
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error('[clerk-webhook] CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // ── 1. Verify signature using svix ──────────────────────────────────────
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.warn('[clerk-webhook] Missing svix headers');
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ id: string; email_address: string }>;
      primary_email_address_id?: string;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string;
      phone_numbers?: Array<{ id: string; phone_number: string }>;
      primary_phone_number_id?: string;
    };
  };

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as typeof evt;
  } catch (err) {
    logger.warn('[clerk-webhook] Signature verification failed', { error: String(err) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── 2. Handle events ───────────────────────────────────────────────────
  const { type: eventType, data } = evt;
  logger.info('[clerk-webhook] Event received', { eventType, userId: data.id });

  const supabase = createAdminClient();

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const primaryEmail =
          data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
            ?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;
        const primaryPhone =
          data.phone_numbers?.find((p) => p.id === data.primary_phone_number_id)
            ?.phone_number ?? null;
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || null;

        // Clerk user IDs (e.g. "user_xxx") are not valid UUIDs, so we store them
        // in the clerk_id column and let Supabase generate the UUID for the id column.
        const { error } = await supabase.from('profiles').upsert(
          {
            clerk_id: data.id,
            email: primaryEmail,
            full_name: fullName,
            phone: primaryPhone,
            avatar_url: data.image_url ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_id' }
        );

        if (error) {
          logger.error('[clerk-webhook] Failed to upsert profile', {
            userId: data.id,
            error: error.message,
          });
          return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
        }

        logger.info('[clerk-webhook] Profile synced', {
          eventType,
          userId: data.id,
          email: primaryEmail ?? '(none)',
        });
        break;
      }

      case 'user.deleted': {
        // Soft-delete: keep row for order history, set deleted_at
        const { error } = await supabase
          .from('profiles')
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_id', data.id);

        if (error) {
          logger.error('[clerk-webhook] Failed to soft-delete profile', {
            userId: data.id,
            error: error.message,
          });
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        logger.info('[clerk-webhook] Profile soft-deleted', { userId: data.id });
        break;
      }

      default:
        logger.info('[clerk-webhook] Unhandled event type', { eventType });
    }
  } catch (error) {
    const err = error as Error;
    logger.error('[clerk-webhook] Processing failed', {
      eventType,
      userId: data?.id,
      message: err.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}