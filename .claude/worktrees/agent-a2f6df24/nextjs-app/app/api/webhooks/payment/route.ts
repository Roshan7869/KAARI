import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { validateWebhookSignature } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const signature = request.headers.get('x-webhook-signature') || '';
    const rawBody = await request.text();

    // Verify signature
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    const isValid = await validateWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
      'hex'
    );

    if (!isValid && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { session_id, order_id, status, transaction_id } = payload;

    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: status === 'completed' ? 'succeeded' : 'failed',
        transaction_id,
        processed_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

    if (paymentError) {
      logger.error('Payment update error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Update order status
    const newOrderStatus = status === 'completed' ? 'paid' : 'pending';
    await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', order_id);

    // Log event
    await supabase.from('order_status_events').insert({
      order_id,
      status: newOrderStatus,
      notes: `Payment webhook processed: ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Payment webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
