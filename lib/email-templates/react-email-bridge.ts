/**
 * React Email Bridge — renders React Email templates to HTML for Resend.
 *
 * Usage:
 *   import { renderOrderConfirmation } from '@/lib/email-templates/react-email-bridge';
 *   const html = await renderOrderConfirmation({ customerName, orderNumber, ... });
 *   await sendEmailWithResend({ to, subject, html });
 */

import { render } from '@react-email/render';
import OrderConfirmationEmail from '@/emails/order-confirmation';
import OrderShippedEmail from '@/emails/order-shipped';
import WelcomeEmail from '@/emails/welcome';

export async function renderOrderConfirmation(props: {
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  items: Array<{ name: string; qty: number; price: string }>;
  shippingAddress: string;
  trackUrl: string;
}): Promise<string> {
  return await render(OrderConfirmationEmail(props));
}

export async function renderOrderShipped(props: {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  courierName: string;
  trackUrl: string;
  estimatedDelivery: string;
}): Promise<string> {
  return await render(OrderShippedEmail(props));
}

export async function renderWelcome(props: {
  customerName: string;
  shopUrl: string;
}): Promise<string> {
  return await render(WelcomeEmail(props));
}