/**
 * Email Notification Service
 * Future integration point for Resend, SendGrid, or Mailgun
 */

import { supabase } from './supabase/client';
import { logger } from './logger';
import { renderTemplate } from './email-templates';
import { checkRateLimit, recordAttempt as recordRateLimitAttempt } from './client-rate-limit';
import type { Database, Json } from '@/types/database';
import type { OrderConfirmationData, WelcomeData, PaymentSuccessData, PaymentFailedData, OrderShippedData } from './email-templates';

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface QueueNotificationParams {
  userId: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  content: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  variant_id: string | null;
  customization_snapshot: unknown | null;
}

export interface OrderDetails {
  order: {
    id: string;
    user_id: string;
    status: string;
    total_amount: number;
    created_at: string;
    checkout_session_id: string | null;
    checkout_sessions: {
      shipping_name: string;
      shipping_line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null;
  };
  items: OrderItem[];
  shippingAddress: {
    country: string;
  };
}

export interface EmailPreferences {
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
}

/**
 * Get a Supabase client instance
 * For client-side usage, uses the browser client directly
 */
function getSupabaseClient() {
  return supabase;
}

/**
 * Send order confirmation email
 * TODO: Integrate with Resend, SendGrid, or Mailgun
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const orderNumber = data.orderNumber || `#${data.orderId}`;

  // template's OrderConfirmationData: email, customerName, orderNumber, orderId, orderDate, items, subtotal, shippingAmount, taxAmount, totalAmount, paymentMethod, shippingAddress, estimatedDelivery, orderUrl
  const templateData: OrderConfirmationData = {
    email: data.email,
    customerName: data.customerName,
    orderNumber,
    orderId: data.orderId,
    orderDate: data.orderDate,
    items: data.items,
    subtotal: data.subtotal || 0,
    shippingAmount: data.shippingAmount || 0,
    taxAmount: data.taxAmount || 0,
    totalAmount: data.totalAmount,
    paymentMethod: data.paymentMethod || 'cod',
    shippingAddress: data.shippingAddress || {
      name: data.customerName,
      line1: '',
      line2: undefined,
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    estimatedDelivery: data.estimatedDelivery,
    orderUrl: data.orderUrl || '',
  };

  let html: string;
  let text: string;
  let subject: string;

  try {
    const templateResult = renderTemplate('order_confirmation', templateData);
    html = templateResult.html;
    text = templateResult.text;
    subject = templateResult.subject;
  } catch (err) {
    logger.error('Failed to render order confirmation email template', { error: err });
    return { success: false, error: err instanceof Error ? err.message : 'Template error' };
  }

  try {
    await queueNotification({
      userId,
      type: 'order_confirmation',
      channel: 'email',
      recipient: data.email,
      subject,
      content: html,
      orderId: data.orderId,
      metadata: {
        order_id: data.orderId,
        order_number: orderNumber,
        total_amount: data.totalAmount,
        customer_name: data.customerName,
        html_content: html,
        text_content: text,
        customer_email: data.email,
        delivery_address: data.shippingAddress.line1 || '',
        estimated_delivery: data.estimatedDelivery || '',
      },
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue order confirmation email', { error: err instanceof Error ? err.message : 'Unknown error' });
    return { success: false, error: err instanceof Error ? err.message : 'Failed to queue email' };
  }
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotificationEmail(
  customerEmail: string,
  orderId: string,
  trackingNumber: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <h1>Your order has been shipped!</h1>
    <p>Your order #${orderId} is on its way.</p>
    <p>Tracking Number: ${trackingNumber}</p>
  `;

  logger.debug('📧 Shipping notification would be sent:', { customerEmail, orderId, trackingNumber });

  try {
    await queueNotification({
      userId: customerEmail,
      type: 'shipping_notification',
      channel: 'email',
      recipient: customerEmail,
      subject: 'Your Order Has Been Shipped',
      content: html,
      orderId,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue shipping notification', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Send promotional email
 */
export async function sendPromotionalEmail(
  customerEmail: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  console.log('📧 Promotional email would be sent:', { customerEmail, subject });

  try {
    await queueNotification({
      userId: customerEmail,
      type: 'promotional',
      channel: 'email',
      recipient: customerEmail,
      subject,
      content: html,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue promotional email', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  data: WelcomeData,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const templateResult = renderTemplate('welcome', data);
  const html = templateResult.html;
  const text = templateResult.text;
  const subject = templateResult.subject;

  try {
    await queueNotification({
      userId,
      type: 'welcome',
      channel: 'email',
      recipient: data.email,
      subject,
      content: html,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue welcome email', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Send payment success email
 */
export async function sendPaymentSuccessEmail(
  data: PaymentSuccessData,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <h1>Payment Successful!</h1>
    <p>Thank you for your payment.</p>
    <p>Order: ${data.orderNumber}</p>
    <p>Amount: ₹${data.amount}</p>
    <p>Transaction ID: ${data.transactionId}</p>
    <p>Payment Method: ${data.paymentMethod}</p>
  `;

  try {
    await queueNotification({
      userId,
      type: 'payment_success',
      channel: 'email',
      recipient: data.email,
      subject: 'Payment Successful',
      content: html,
      orderId: data.orderId,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue payment success email', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  data: PaymentFailedData,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <h1>Payment Failed</h1>
    <p>We couldn't process your payment.</p>
    <p>Order: ${data.orderNumber}</p>
    <p>Amount: ₹${data.amount}</p>
    <p>Reason: ${data.failureReason}</p>
    <p>Please try again or contact support.</p>
  `;

  try {
    await queueNotification({
      userId,
      type: 'payment_failed',
      channel: 'email',
      recipient: data.email,
      subject: 'Payment Failed',
      content: html,
      orderId: data.orderId,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue payment failed email', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Send order shipped email
 */
export async function sendOrderShippedEmail(
  data: OrderShippedData,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <h1>Your Order Has Been Shipped!</h1>
    <p>Your order ${data.orderNumber} is on its way.</p>
    <p><strong>Carrier:</strong> ${data.carrier}</p>
    <p><strong>Tracking:</strong> ${data.trackingNumber}</p>
    <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
    <a href="${data.trackingUrl}">Track your package</a>
  `;

  try {
    await queueNotification({
      userId,
      type: 'order_shipped',
      channel: 'email',
      recipient: data.email,
      subject: 'Order Shipped',
      content: html,
      orderId: data.orderId,
    });
    return { success: true };
  } catch (err) {
    logger.error('Failed to queue order shipped email', { error: err });
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Fetch order details for email
 */
export async function fetchOrderDetailsForEmail(
  orderId: string
): Promise<OrderDetails | null> {
  try {
    // First, get the order with checkout_sessions
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        total_amount,
        created_at,
        checkout_session_id,
        checkout_sessions (shipping_name, shipping_line1, city, state, postal_code, country)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error('Failed to fetch order', { error: orderError, orderId });
      return null;
    }

    // Then, get order items with product info
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        products (title),
        quantity,
        unit_price,
        variant_id,
        customization_snapshot
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      logger.error('Failed to fetch order items', { error: itemsError, orderId });
      return null;
    }

    // Transform items to match expected format
    const transformedItems: OrderItem[] = items.map(item => ({
      name: item.products?.title || 'Unknown Product',
      quantity: item.quantity,
      unit_price: item.unit_price,
      variant_id: item.variant_id,
      customization_snapshot: item.customization_snapshot,
    }));

    // Extract shipping address
    const shippingAddress = order.checkout_sessions
      ? {
          country: order.checkout_sessions.country || 'India',
        }
      : { country: 'India' };

    // Map checkout_sessions to ensure non-null values for OrderDetails
    const checkoutSessions = order.checkout_sessions
      ? {
          shipping_name: order.checkout_sessions.shipping_name || '',
          shipping_line1: order.checkout_sessions.shipping_line1 || '',
          city: order.checkout_sessions.city || '',
          state: order.checkout_sessions.state || '',
          postal_code: order.checkout_sessions.postal_code || '',
          country: order.checkout_sessions.country || 'India',
        }
      : null;

    return {
      order: {
        id: order.id,
        user_id: order.user_id,
        status: order.status,
        total_amount: order.total_amount ?? 0,
        created_at: order.created_at,
        checkout_session_id: order.checkout_session_id,
        checkout_sessions: checkoutSessions,
      },
      items: transformedItems,
      shippingAddress,
    };
  } catch (err) {
    logger.error('Exception fetching order details', { error: err, orderId });
    return null;
  }
}

/**
 * Queue a notification
 */
export async function queueNotification(
  params: QueueNotificationParams
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    // Rate limit check for email channel
    if (params.channel === 'email') {
      const rateLimit = await checkUserEmailRateLimit(params.userId);
      if (!rateLimit.allowed) {
        if (rateLimit.blocked) {
          logger.warn('Email rate limit exceeded', {
            userId: params.userId,
            type: params.type,
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt,
          });
          return {
            success: false,
            error: 'Too many emails sent. Please try again later.',
          };
        }
        // Not blocked but no more quota - return error
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait before sending more emails.',
        };
      }
      // Record rate limit attempt
      recordRateLimitAttempt('checkout', params.userId, true);
    }

    // Call the queue_notification RPC
    const { data, error } = await supabase.rpc('queue_notification', {
      p_user_id: params.userId,
      p_type: params.type,
      p_channel: params.channel,
      p_recipient: params.recipient,
      p_subject: params.subject,
      p_content: params.content,
      p_order_id: params.orderId || null,
      p_metadata: (params.metadata as Json) || null,
    });

    if (error) {
      logger.error('Failed to queue notification', {
        error: error.message,
        params,
      });
      return { success: false, error: error.message };
    }

    logger.info('Notification queued successfully', {
      notificationId: data,
      type: params.type,
      channel: params.channel,
    });

    return { success: true, notificationId: data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception while queuing notification', {
      error: errorMessage,
      params,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send email directly via Resend API
 */
export async function sendEmailDirect(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      // Try to parse error response, fallback to default if parsing fails
      let errorMessage = 'Failed to send email';
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'message' in errorData) {
          errorMessage = String(errorData.message);
        }
      } catch {
        // If JSON parsing fails, use default error message
      }
      logger.error('Failed to send email via Resend', {
        status: response.status,
        error: { message: errorMessage },
      });
      return { success: false, error: errorMessage };
    }

    // Parse success response
    let result: { id?: string };
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    logger.info('Email sent successfully via Resend', {
      id: result.id,
      to,
      subject,
    });

    return { success: true, id: result.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception sending email', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Check user email rate limit
 */
export async function checkUserEmailRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: string;
  blocked: boolean;
}> {
  // Use the rate limit from rateLimit.ts with 'checkout' type
  const result = checkRateLimit('checkout', userId);
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.resetAt?.toISOString() ?? new Date(Date.now() + 60000).toISOString(),
    blocked: result.blocked,
  };
}

/**
 * Record rate limit attempt
 */
export async function recordAttempt(key: string, userId: string, success: boolean): Promise<void> {
  // Use the rate limit recordAttempt from rateLimit.ts with 'checkout' type
  recordRateLimitAttempt('checkout', userId, success);
}
