import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmailWithResend } from '@/lib/resend-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/send-emails
 * Cron job to send queued emails via Resend
 * Runs every minute via Vercel Cron
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron access attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Get pending emails (limit 10 to avoid timeout)
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'PENDING')
      .limit(10)
      .order('created_at', { ascending: true });

    if (fetchError) {
      logger.error('Failed to fetch emails from queue', { error: fetchError.message });
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No emails to send' });
    }

    let processed = 0;

    // Process each email
    for (const email of emails) {
      try {
        // Send email via Resend
        const result = await sendEmailWithResend({
          to: email.recipient,
          subject: getEmailSubject(email.type, email.order_id),
          html: await getEmailTemplate(email.type, email.order_id),
        });

        if (result.id) {
          // Update status to SENT
          await supabase
            .from('email_queue')
            .update({
              status: 'SENT',
              sent_at: new Date().toISOString(),
              retry_count: email.retry_count + 1
            })
            .eq('id', email.id);

          processed++;
          logger.info('Email sent successfully', {
            emailId: email.id,
            orderId: email.order_id,
            recipient: email.recipient
          });
        } else {
          // Failed to send - increment retry count
          await supabase
            .from('email_queue')
            .update({
              retry_count: email.retry_count + 1,
              error: 'Failed to send via Resend'
            })
            .eq('id', email.id);

          logger.warn('Email send failed', {
            emailId: email.id,
            orderId: email.order_id,
            recipient: email.recipient,
            error: result
          });
        }
      } catch (error) {
        // Handle send errors
        await supabase
          .from('email_queue')
          .update({
            status: 'FAILED',
            error: (error as Error).message,
            retry_count: email.retry_count + 1
          })
          .eq('id', email.id);

        logger.error('Email processing failed', {
          emailId: email.id,
          orderId: email.order_id,
          recipient: email.recipient,
          error: (error as Error).message
        });
      }
    }

    return NextResponse.json({
      processed,
      total: emails.length,
      message: `Processed ${processed} of ${emails.length} emails`
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Cron job failed', { message: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper functions for email templates
function getEmailSubject(type: string, orderId: string): string {
  switch (type) {
    case 'order_confirmation':
      return `Order Confirmation - ${orderId.slice(0, 8)}`;
    case 'shipping_notification':
      return `Your Order is on the Way - ${orderId.slice(0, 8)}`;
    case 'delivery_update':
      return `Delivery Update - ${orderId.slice(0, 8)}`;
    default:
      return `Notification - ${orderId.slice(0, 8)}`;
  }
}

async function getEmailTemplate(type: string, orderId: string): Promise<string> {
  switch (type) {
    case 'order_confirmation':
      return `
        <h2>Order Confirmed!</h2>
        <p>Thank you for your order. Your order ID is: <strong>${orderId.slice(0, 8)}</strong></p>
        <p>You will receive updates as your order is processed and shipped.</p>
      `;
    case 'shipping_notification':
      return `
        <h2>Your Order is Shipping!</h2>
        <p>Your order ${orderId.slice(0, 8)} has been shipped and is on its way to you.</p>
      `;
    case 'delivery_update':
      return `
        <h2>Delivery Update</h2>
        <p>Your order ${orderId.slice(0, 8)} has been delivered successfully!</p>
      `;
    default:
      return `<p>Notification regarding your order ${orderId.slice(0, 8)}</p>`;
  }
}