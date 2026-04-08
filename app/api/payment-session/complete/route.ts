import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/payment-session/complete
 * Completes a payment session (marks as completed/failed).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const { sessionId, transactionId, status } = await request.json() as {
    sessionId: string;
    transactionId: string;
    status: 'completed' | 'failed';
  };

  if (!sessionId || !transactionId || !status) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc('complete_payment_session', {
    p_session_id: sessionId,
    p_transaction_id: transactionId,
    p_status: status,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ success: false, error: 'Invalid response' }, { status: 500 });
  }

  const result = data[0];
  return NextResponse.json({
    success: result.success,
    orderId: result.order_id,
    error: result.message,
  });
}
