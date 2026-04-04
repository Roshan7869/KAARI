/**
 * Order Shipped Email Template
 * Sent when an order is shipped with tracking information
 *
 * SECURITY: All user-provided data is sanitized to prevent XSS/injection attacks
 */

import { renderBaseTemplate, renderButton, renderDivider, formatDate } from './base';
import {
  sanitizeCustomerName,
  sanitizeOrderId,
  sanitizeCarrierName,
  sanitizeTrackingNumber,
  sanitizeAddressLine,
  sanitizeProductText,
  sanitizeEmailUrl,
} from './sanitize';

export interface OrderShippedData {
  email: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  shippedDate: string;
  estimatedDelivery: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  orderUrl: string;
}

/**
 * Render order shipped email HTML
 * Applies security sanitization to all user-provided data
 */
export function renderOrderShippedHtml(data: OrderShippedData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedCarrier = sanitizeCarrierName(data.carrier);
  const sanitizedTrackingNumber = sanitizeTrackingNumber(data.trackingNumber);
  const sanitizedTrackingUrl = sanitizeEmailUrl(data.trackingUrl); // External tracking URLs allowed
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl);
  const sanitizedAddress = {
    name: sanitizeCustomerName(data.shippingAddress.name),
    line1: sanitizeAddressLine(data.shippingAddress.line1),
    line2: data.shippingAddress.line2 ? sanitizeAddressLine(data.shippingAddress.line2) : undefined,
    city: sanitizeAddressLine(data.shippingAddress.city),
    state: sanitizeAddressLine(data.shippingAddress.state),
    postalCode: sanitizeAddressLine(data.shippingAddress.postalCode),
    country: sanitizeAddressLine(data.shippingAddress.country),
  };

  const mainContent = `
    <!-- Header -->
    <div style="text-align: center; padding: 20px 0;">
      <div style="width: 80px; height: 80px; background-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px auto; display: inline-block;">
        <span style="font-size: 36px; line-height: 80px;">&#128666;</span>
      </div>
      <h2 style="margin: 0 0 10px 0; color: #3d2914; font-size: 24px; font-family: 'Georgia', serif;">
        Your Order is on Its Way!
      </h2>
      <p style="margin: 0; color: #5c4a3a; font-size: 15px;">
        Great news! Your order has been shipped.
      </p>
    </div>

    ${renderDivider()}

    <!-- Tracking Info -->
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #bfdbfe;">
      <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Tracking Information</h3>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #3b82f6; font-size: 13px;">Carrier</td>
          <td align="right" style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">${sanitizedCarrier}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #3b82f6; font-size: 13px;">Tracking Number</td>
          <td align="right" style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">${sanitizedTrackingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #3b82f6; font-size: 13px;">Shipped On</td>
          <td align="right" style="padding: 8px 0; color: #1e3a8a; font-size: 14px;">${formatDate(data.shippedDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #3b82f6; font-size: 13px;">Estimated Delivery</td>
          <td align="right" style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">${sanitizeProductText(data.estimatedDelivery)}</td>
        </tr>
      </table>
    </div>

    ${sanitizedTrackingUrl ? renderButton('Track Your Package', sanitizedTrackingUrl) : ''}

    ${renderDivider()}

    <!-- Shipped Items -->
    <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">What's Inside</h3>
    <p style="margin: 0 0 15px 0; color: #5c4a3a; font-size: 14px;">
      Dear ${sanitizedName}, your order contains:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${data.items.map(item => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f0eb;">
            <p style="margin: 0; color: #3d2914; font-size: 15px; font-weight: 500;">${sanitizeProductText(item.name)}</p>
            <p style="margin: 3px 0 0 0; color: #a08070; font-size: 13px;">Quantity: ${item.quantity}</p>
          </td>
        </tr>
      `).join('')}
    </table>

    ${renderDivider()}

    <!-- Shipping Address -->
    <h3 style="margin: 0 0 10px 0; color: #3d2914; font-size: 16px;">Shipping Address</h3>
    <div style="background-color: #faf7f4; border-radius: 8px; padding: 15px;">
      <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
        <strong>${sanitizedAddress.name}</strong><br>
        ${sanitizedAddress.line1}<br>
        ${sanitizedAddress.line2 ? `${sanitizedAddress.line2}<br>` : ''}
        ${sanitizedAddress.city}, ${sanitizedAddress.state} ${sanitizedAddress.postalCode}<br>
        ${sanitizedAddress.country}
      </p>
    </div>

    ${renderDivider()}

    <!-- Help -->
    <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6; text-align: center;">
      Questions about your delivery?
      ${sanitizedOrderUrl ? `<a href="${sanitizedOrderUrl}" style="color: #D2691E; text-decoration: none;">View your order</a> or` : ''}
      <a href="mailto:hello@kaari.shop" style="color: #D2691E; text-decoration: none;">contact us</a>.
    </p>
  `;

  return renderBaseTemplate({
    content: mainContent,
    previewText: `Your order #${sanitizedOrderId} has shipped! Track your package with ${sanitizedCarrier}.`,
    showUnsubscribe: false,
  });
}

/**
 * Render order shipped email plain text
 * Applies security sanitization to all user-provided data
 */
export function renderOrderShippedText(data: OrderShippedData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedCarrier = sanitizeCarrierName(data.carrier);
  const sanitizedTrackingNumber = sanitizeTrackingNumber(data.trackingNumber);
  const sanitizedTrackingUrl = sanitizeEmailUrl(data.trackingUrl);
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl);

  const itemsList = data.items
    .map(item => `- ${sanitizeProductText(item.name)} (Qty: ${item.quantity})`)
    .join('\n');

  const addressLines = [
    sanitizeCustomerName(data.shippingAddress.name),
    sanitizeAddressLine(data.shippingAddress.line1),
    data.shippingAddress.line2 ? sanitizeAddressLine(data.shippingAddress.line2) : null,
    `${sanitizeAddressLine(data.shippingAddress.city)}, ${sanitizeAddressLine(data.shippingAddress.state)} ${sanitizeAddressLine(data.shippingAddress.postalCode)}`,
    sanitizeAddressLine(data.shippingAddress.country),
  ].filter(Boolean).join('\n');

  return `
YOUR ORDER HAS SHIPPED!
=======================

Dear ${sanitizedName},

Great news! Your order #${sanitizedOrderId} has been shipped.

TRACKING INFORMATION
--------------------
Carrier: ${sanitizedCarrier}
Tracking Number: ${sanitizedTrackingNumber}
Shipped On: ${formatDate(data.shippedDate)}
Estimated Delivery: ${sanitizeProductText(data.estimatedDelivery)}

${sanitizedTrackingUrl ? `Track your package: ${sanitizedTrackingUrl}` : ''}

WHAT'S INSIDE
-------------
${itemsList}

SHIPPING ADDRESS
----------------
${addressLines}

${sanitizedOrderUrl ? `Questions? View your order: ${sanitizedOrderUrl}` : ''}
Or contact us at hello@kaari.shop

Thank you for shopping with Kaari!
`;
}