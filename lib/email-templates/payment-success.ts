/**
 * Payment Success Email Template
 * Sent when a payment is successfully processed
 *
 * SECURITY: All user-provided data is sanitized to prevent XSS/injection attacks
 */

import { renderBaseTemplate, renderButton, renderDivider, formatCurrency, formatDate } from './base';
import {
  sanitizeCustomerName,
  sanitizeOrderId,
  sanitizeProductText,
  sanitizeEmailUrl,
  ALLOWED_EMAIL_DOMAINS,
} from './sanitize';

export interface PaymentSuccessData {
  email: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  orderDate: string;
  orderUrl: string;
}

/**
 * Render payment success email HTML
 * Applies security sanitization to all user-provided data
 */
export function renderPaymentSuccessHtml(data: PaymentSuccessData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedTransactionId = sanitizeOrderId(data.transactionId);
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedPaymentMethod = sanitizeProductText(data.paymentMethod);

  const mainContent = `
    <!-- Success Header -->
    <div style="text-align: center; padding: 20px 0;">
      <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto 20px auto; display: inline-block;">
        <span style="font-size: 40px; line-height: 80px; color: white;">&#10003;</span>
      </div>
      <h2 style="margin: 0 0 10px 0; color: #10b981; font-size: 24px; font-family: 'Georgia', serif;">
        Payment Successful!
      </h2>
      <p style="margin: 0; color: #5c4a3a; font-size: 15px;">
        Your payment has been processed successfully
      </p>
    </div>

    ${renderDivider()}

    <!-- Order Summary -->
    <div style="background-color: #faf7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">Payment Details</h3>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Order Number</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px; font-weight: 600;">${sanitizedOrderId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Transaction ID</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px;">${sanitizedTransactionId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Payment Method</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px;">${sanitizedPaymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Date</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px;">${formatDate(data.orderDate)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 15px;">
            <div style="height: 1px; background-color: #e5ddd5;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0; color: #3d2914; font-size: 16px; font-weight: 600;">Amount Paid</td>
          <td align="right" style="padding: 15px 0; color: #D2691E; font-size: 20px; font-weight: 600;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    ${renderDivider()}

    <!-- What's Next -->
    <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">What Happens Next?</h3>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 10px 0; vertical-align: top;">
          <div style="width: 24px; height: 24px; background-color: #fef3e2; border-radius: 50%; text-align: center; display: inline-block;">
            <span style="color: #D2691E; font-size: 14px; line-height: 24px;">1</span>
          </div>
        </td>
        <td style="padding: 10px 0 10px 10px; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <strong style="color: #3d2914;">Order Preparation</strong><br>
          We're preparing your order with care and attention to detail.
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; vertical-align: top;">
          <div style="width: 24px; height: 24px; background-color: #fef3e2; border-radius: 50%; text-align: center; display: inline-block;">
            <span style="color: #D2691E; font-size: 14px; line-height: 24px;">2</span>
          </div>
        </td>
        <td style="padding: 10px 0 10px 10px; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <strong style="color: #3d2914;">Shipping</strong><br>
          You'll receive a shipping confirmation with tracking details.
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; vertical-align: top;">
          <div style="width: 24px; height: 24px; background-color: #fef3e2; border-radius: 50%; text-align: center; display: inline-block;">
            <span style="color: #D2691E; font-size: 14px; line-height: 24px;">3</span>
          </div>
        </td>
        <td style="padding: 10px 0 10px 10px; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <strong style="color: #3d2914;">Delivery</strong><br>
          Your handmade items will arrive at your doorstep.
        </td>
      </tr>
    </table>

    ${sanitizedOrderUrl ? renderButton('View Order Details', sanitizedOrderUrl) : ''}

    <p style="margin: 25px 0 0 0; color: #a08070; font-size: 13px; text-align: center;">
      Questions about your order? Reply to this email or contact us at hello@kaari.shop
    </p>
  `;

  return renderBaseTemplate({
    content: mainContent,
    previewText: `Payment confirmed for order #${sanitizedOrderId}. Amount: ${formatCurrency(data.amount)}`,
    showUnsubscribe: false,
  });
}

/**
 * Render payment success email plain text
 * Applies security sanitization to all user-provided data
 */
export function renderPaymentSuccessText(data: PaymentSuccessData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedTransactionId = sanitizeOrderId(data.transactionId);
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedPaymentMethod = sanitizeProductText(data.paymentMethod);

  return `
PAYMENT SUCCESSFUL
==================

Dear ${sanitizedName},

Your payment has been processed successfully!

PAYMENT DETAILS
---------------
Order Number: ${sanitizedOrderId}
Transaction ID: ${sanitizedTransactionId}
Payment Method: ${sanitizedPaymentMethod}
Date: ${formatDate(data.orderDate)}
Amount Paid: ${formatCurrency(data.amount)}

WHAT HAPPENS NEXT?
------------------
1. Order Preparation - We're preparing your order with care
2. Shipping - You'll receive shipping confirmation with tracking
3. Delivery - Your handmade items will arrive at your doorstep

${sanitizedOrderUrl ? `View order details: ${sanitizedOrderUrl}` : ''}

Questions? Contact us at hello@kaari.shop

Thank you for shopping with Kaari!
`;
}