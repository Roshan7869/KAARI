import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentSessionIdSchema } from '@/lib/validations/payment.schema';

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
  const parsed = PaymentSessionIdSchema.safeParse({ session_id: searchParams.get('session_id') });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid session_id', details: parsed.error.errors }, { status: 400 });
  }
  const { session_id: sessionId } = parsed.data;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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
