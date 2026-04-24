import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

/**
 * POST /api/payment-session/verify
 * Verifies a payment session belongs to the current user.
 *
 * SECURITY: Always enforces ownership. The requireOwnership parameter is
 * no longer accepted from the client — every request must pass the
 * authenticated user's ID to the RPC.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ valid: false, error: 'Authentication required' }, { status: 401 });
  }

  const { sessionId } = await request.json() as {
    sessionId: string;
  };

  if (!sessionId) {
    return NextResponse.json({ valid: false, error: 'sessionId is required' }, { status: 400 });
  }

  // Always enforce ownership — pass authenticated userId, never null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc('verify_payment_session', {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (error) {
    logger.error('Payment session verification failed', { error, sessionId });
    return NextResponse.json({ valid: false, error: 'Failed to verify payment session' }, { status: 500 });
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ valid: false, error: 'Session not found' });
  }

  const result = data[0];
  return NextResponse.json({
    valid: result.valid,
    sessionId: result.session_id,
    orderId: result.order_id,
    amount: result.amount ? parseFloat(String(result.amount)) : undefined,
    status: result.status,
    error: result.error ?? undefined,
  });
}