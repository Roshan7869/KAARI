import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger-server';

const SavePaymentConfigSchema = z.object({
  api_key: z.string().trim().optional(),
  api_secret: z.string().trim().optional(),
  webhook_secret: z.string().trim().optional(),
  is_test_mode: z.boolean(),
  is_active: z.boolean(),
});

/**
 * GET /api/admin/settings/payment
 * Returns payment gateway config with MASKED secrets. Admin only.
 *
 * SECURITY: api_secret and webhook_secret are NEVER returned to the client.
 * Only a masked version of api_key is shown for verification.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('id, provider, api_key, api_secret, webhook_secret, is_test_mode, is_active, updated_at')
      .eq('provider', 'cashfree')
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch payment config', { error });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    // Mask the api_key for display — NEVER return secrets
    const maskedApiKey = data?.api_key
      ? data.api_key.slice(0, 4) + '••••••' + data.api_key.slice(-4)
      : '';

    return NextResponse.json({
      id: data?.id ?? null,
      provider: data?.provider ?? 'cashfree',
      api_key_masked: maskedApiKey,
      has_api_secret: !!data?.api_secret, // just indicate presence, not value
      has_webhook_secret: !!data?.webhook_secret,
      is_test_mode: data?.is_test_mode ?? true,
      is_active: data?.is_active ?? false,
      updated_at: data?.updated_at ?? null,
    });
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.message.includes('Unauthorized') ? 401 : 403 });
    }
    logger.error('Payment config GET failed', { error: error.message });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/payment
 * Save payment gateway credentials. Admin only.
 *
 * SECURITY: Secrets are written server-side and never returned in responses.
 * Only the fact that secrets exist is communicated to the client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const body = await request.json();
    const validated = SavePaymentConfigSchema.parse(body);

    const supabase = createAdminClient();

    // Check if config already exists
    const { data: existing } = await supabase
      .from('payment_gateways')
      .select('id, api_key, api_secret, webhook_secret')
      .eq('provider', 'cashfree')
      .maybeSingle();

    const incomingApiKey = validated.api_key && !validated.api_key.includes('••') ? validated.api_key : undefined;
    const incomingApiSecret = validated.api_secret && !validated.api_secret.includes('••') ? validated.api_secret : undefined;
    const incomingWebhookSecret = validated.webhook_secret && !validated.webhook_secret.includes('••') ? validated.webhook_secret : undefined;

    const effectiveApiKey = incomingApiKey ?? existing?.api_key ?? null;
    const effectiveApiSecret = incomingApiSecret ?? existing?.api_secret ?? null;
    if (validated.is_active && (!effectiveApiKey || !effectiveApiSecret)) {
      return NextResponse.json({
        error: 'API Key and Secret are required to activate the gateway',
      }, { status: 400 });
    }

    let error;
    if (existing) {
      // Update existing — only overwrite secrets if new values provided
      const updateData: Record<string, unknown> = {
        is_test_mode: validated.is_test_mode,
        is_active: validated.is_active,
        updated_at: new Date().toISOString(),
      };
      // Only update secrets if they're not placeholder values
      if (incomingApiKey) {
        updateData.api_key = incomingApiKey;
      }
      if (incomingApiSecret) {
        updateData.api_secret = incomingApiSecret;
      }
      if (incomingWebhookSecret) {
        updateData.webhook_secret = incomingWebhookSecret;
      }

      ({ error } = await supabase
        .from('payment_gateways')
        .update(updateData)
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase
        .from('payment_gateways')
        .insert({
          provider: 'cashfree',
          api_key: incomingApiKey ?? null,
          api_secret: incomingApiSecret ?? null,
          webhook_secret: incomingWebhookSecret ?? null,
          is_test_mode: validated.is_test_mode,
          is_active: validated.is_active,
        }));
    }

    if (error) {
      logger.error('Failed to save payment config', { error });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.message.includes('Unauthorized') ? 401 : 403 });
    }
    logger.error('Payment config POST failed', { error: error.message });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
