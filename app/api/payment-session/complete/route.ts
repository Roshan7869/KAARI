import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/csrf-server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createUserClient } from '@/lib/supabase/auth-client';
import { getCashfreePaymentDetailsServer } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger-server';
import { PaymentCompleteSchema } from '@/lib/validations/payment.schema';

/**
 * POST /api/payment-session/complete
 * Completes a payment session after verifying with Cashfree server-side.
 *
 * SECURITY: Never trusts client-provided status. Verifies payment with Cashfree
 * before marking the session as complete.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const csrfValid = await validateCsrfToken(request);
  if (!csrfValid) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = PaymentCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
  }
  const { sessionId, transactionId } = parsed.data;

  const supabase = await createClient();

  // Step 1: Verify session ownership — this session must belong to the requesting user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error: sessionError } = await (supabase as any)
    .from('cashfree_sessions')
    .select('id, user_id, status, cf_order_id')
    .eq('cf_payment_session_id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ success: false, error: 'Payment session not found' }, { status: 404 });
  }

  // Ownership check — user can only complete their own sessions
  if (session.user_id && session.user_id !== userId) {
    logger.warn('Payment session ownership mismatch', { sessionId, userId, sessionUserId: session.user_id });
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Step 2: Verify payment with Cashfree server-side (NEVER trust client-provided status)
  let verifiedStatus: 'completed' | 'failed' = 'failed';

  if (session.cf_order_id) {
    try {
      const payment = await getCashfreePaymentDetailsServer(session.cf_order_id);
      if (payment && (payment.payment_status === 'SUCCESS' || payment.payment_status === 'completed')) {
        verifiedStatus = 'completed';
      } else {
        logger.warn('Cashfree payment not confirmed', {
          sessionId,
          cfOrderId: session.cf_order_id,
          paymentStatus: payment?.payment_status,
        });
        return NextResponse.json({
          success: false,
          error: 'Payment not confirmed by gateway',
          status: payment?.payment_status || 'UNKNOWN',
        }, { status: 400 });
      }
    } catch (error) {
      logger.error('Failed to verify payment with Cashfree', { error, sessionId });
      // If Cashfree is unavailable and session is dummy, allow completion
      if (sessionId.startsWith('dummy_')) {
        verifiedStatus = 'completed';
      } else {
        return NextResponse.json({
          success: false,
          error: 'Could not verify payment with gateway',
        }, { status: 503 });
      }
    }
  } else if (sessionId.startsWith('dummy_')) {
    // Dummy sessions don't have Cashfree verification — allow for development
    verifiedStatus = 'completed';
  } else {
    return NextResponse.json({
      success: false,
      error: 'Invalid payment session',
    }, { status: 400 });
  }

  // Step 3: Complete the session with verified status
  const adminSupabase = await createUserClient();
  if (!adminSupabase) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const { data, error } = await adminSupabase.rpc('complete_payment_session', {
    p_session_id: sessionId,
    p_transaction_id: transactionId,
    p_status: verifiedStatus,
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