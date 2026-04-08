import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/payment-session?session_id=xxx
 * Returns the payment session belonging to the authenticated user.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'session_id is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payment_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Payment session not found' }, { status: 404 });
  }

  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: 'Payment session has expired' }, { status: 410 });
  }

  return NextResponse.json({
    success: true,
    session: {
      sessionId: data.session_id,
      orderId: data.order_id,
      amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)),
      currency: data.currency,
      status: data.status,
      paymentMethod: data.payment_method,
      expiresAt: data.expires_at,
    },
  });
}
