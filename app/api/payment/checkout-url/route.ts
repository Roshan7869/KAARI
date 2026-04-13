import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeCheckoutUrlAsync } from '@/lib/cashfree';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * GET /api/payment/checkout-url
 *
 * Returns the Cashfree hosted checkout URL for a given payment session.
 * This endpoint exists because getCashfreeCheckoutUrlAsync reads server-side
 * config (isTestMode) from getCashfreeConfig() — which uses secretKey and must
 * never be imported in a client component.
 *
 * Client components should call this API instead of importing from lib/cashfree.
 */
const QuerySchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
  return_url: z.string().url().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const parsed = QuerySchema.safeParse({
    session_id: searchParams.get('session_id'),
    return_url: searchParams.get('return_url') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { session_id, return_url } = parsed.data;

  try {
    const checkoutUrl = await getCashfreeCheckoutUrlAsync(session_id, return_url);
    logger.info('Checkout URL generated', { session_id, is_dummy: session_id.startsWith('dummy_') });
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate checkout URL';
    logger.error('Failed to generate checkout URL', { session_id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}