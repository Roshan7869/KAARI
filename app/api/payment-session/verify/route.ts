import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/payment-session/verify
 * Verifies a payment session belongs to the current user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();

  const { sessionId, requireOwnership = true } = await request.json() as {
    sessionId: string;
    requireOwnership?: boolean;
  };

  if (!sessionId) {
    return NextResponse.json({ valid: false, error: 'sessionId is required' }, { status: 400 });
  }

  const lookupUserId = requireOwnership ? userId : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc('verify_payment_session', {
    p_session_id: sessionId,
    p_user_id: lookupUserId,
  });

  if (error) {
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
