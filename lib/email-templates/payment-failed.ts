/**
 * Payment Failed Email Template
 * Sent when a payment fails to process
 *
 * SECURITY: All user-provided data is sanitized to prevent XSS/injection attacks
 */

import { renderBaseTemplate, renderButton, renderDivider, formatCurrency, formatDate } from './base';
import {
  sanitizeCustomerName,
  sanitizeOrderId,
  sanitizeErrorMessage,
  sanitizeEmailUrl,
  ALLOWED_EMAIL_DOMAINS,
} from './sanitize';

export interface PaymentFailedData {
  email: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  amount: number;
  failureReason: string;
  orderDate: string;
  retryUrl: string;
  supportUrl: string;
}

/**
 * Render payment failed email HTML
 * Applies security sanitization to all user-provided data
 */
export function renderPaymentFailedHtml(data: PaymentFailedData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedRetryUrl = sanitizeEmailUrl(data.retryUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedSupportUrl = sanitizeEmailUrl(data.supportUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedFailureReason = sanitizeErrorMessage(data.failureReason);

  const mainContent = `
    <!-- Header -->
    <div style="text-align: center; padding: 20px 0;">
      <div style="width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; margin: 0 auto 20px auto; display: inline-block;">
        <span style="font-size: 40px; line-height: 80px; color: white;">!</span>
      </div>
      <h2 style="margin: 0 0 10px 0; color: #ef4444; font-size: 24px; font-family: 'Georgia', serif;">
        Payment Failed
      </h2>
      <p style="margin: 0; color: #5c4a3a; font-size: 15px;">
        We couldn't process your payment
      </p>
    </div>

    ${renderDivider()}

    <!-- Greeting -->
    <p style="margin: 0 0 20px 0; color: #5c4a3a; font-size: 15px; line-height: 1.6;">
      Dear ${sanitizedName},
    </p>
    <p style="margin: 0 0 20px 0; color: #5c4a3a; font-size: 15px; line-height: 1.6;">
      Unfortunately, we were unable to process your payment for order <strong>#${sanitizedOrderId}</strong>.
      Your order has been placed on hold until we receive a successful payment.
    </p>

    <!-- Error Details -->
    <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">Payment Error</h3>
      <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
        <strong>Reason:</strong> ${sanitizedFailureReason}
      </p>
    </div>

    ${renderDivider()}

    <!-- Order Summary -->
    <div style="background-color: #faf7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">Order Summary</h3>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Order Number</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px; font-weight: 600;">${sanitizedOrderId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #a08070; font-size: 13px;">Order Date</td>
          <td align="right" style="padding: 8px 0; color: #3d2914; font-size: 14px;">${formatDate(data.orderDate)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 15px;">
            <div style="height: 1px; background-color: #e5ddd5;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0; color: #3d2914; font-size: 16px; font-weight: 600;">Amount Due</td>
          <td align="right" style="padding: 15px 0; color: #D2691E; font-size: 20px; font-weight: 600;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    ${renderDivider()}

    <!-- What to Do -->
    <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">What Can You Do?</h3>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <span style="color: #D2691E;">1.</span>
          <strong>Check your payment details</strong> - Make sure your card information is correct and has sufficient funds.
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <span style="color: #D2691E;">2.</span>
          <strong>Try a different payment method</strong> - Consider using another card or payment option.
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
          <span style="color: #D2691E;">3.</span>
          <strong>Contact your bank</strong> - Sometimes banks block legitimate transactions.
        </td>
      </tr>
    </table>

    ${sanitizedRetryUrl ? renderButton('Retry Payment', sanitizedRetryUrl, 'primary') : ''}

    ${sanitizedSupportUrl ? `
    <p style="margin: 15px 0 0 0; text-align: center;">
      <a href="${sanitizedSupportUrl}" style="color: #8B4513; text-decoration: none; font-size: 14px;">
        Need help? Contact our support team
      </a>
    </p>
    ` : ''}

    <!-- Note -->
    <div style="margin-top: 30px; padding: 15px; background-color: #f8f4ef; border-radius: 8px;">
      <p style="margin: 0; color: #a08070; font-size: 12px; line-height: 1.6;">
        <strong>Note:</strong> Your order will remain in pending status for 24 hours.
        If payment is not completed within this time, the order will be automatically cancelled
        and items returned to inventory.
      </p>
    </div>
  `;

  return renderBaseTemplate({
    content: mainContent,
    previewText: `Payment failed for order #${sanitizedOrderId}. Please retry payment to complete your order.`,
    showUnsubscribe: false,
  });
}

/**
 * Render payment failed email plain text
 * Applies security sanitization to all user-provided data
 */
export function renderPaymentFailedText(data: PaymentFailedData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedRetryUrl = sanitizeEmailUrl(data.retryUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedSupportUrl = sanitizeEmailUrl(data.supportUrl, ALLOWED_EMAIL_DOMAINS);
  const sanitizedFailureReason = sanitizeErrorMessage(data.failureReason);

  return `
PAYMENT FAILED
==============

Dear ${sanitizedName},

Unfortunately, we were unable to process your payment for order #${sanitizedOrderId}.
Your order has been placed on hold until we receive a successful payment.

PAYMENT ERROR
-------------
Reason: ${sanitizedFailureReason}

ORDER SUMMARY
-------------
Order Number: ${sanitizedOrderId}
Order Date: ${formatDate(data.orderDate)}
Amount Due: ${formatCurrency(data.amount)}

WHAT CAN YOU DO?
----------------
1. Check your payment details - Make sure your card information is correct
2. Try a different payment method - Consider using another card or payment option
3. Contact your bank - Sometimes banks block legitimate transactions

${sanitizedRetryUrl ? `Retry payment: ${sanitizedRetryUrl}` : ''}

${sanitizedSupportUrl ? `Need help? Contact our support team: ${sanitizedSupportUrl}` : ''}

NOTE: Your order will remain in pending status for 24 hours.
If payment is not completed within this time, the order will be automatically cancelled.

Questions? Contact us at hello@kaari.in
`;
}