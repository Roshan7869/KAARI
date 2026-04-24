/**
 * Order Confirmation Email Template
 * Sent when a customer places a new order
 *
 * SECURITY: All user-provided data is sanitized to prevent XSS/injection attacks
 */

import { renderBaseTemplate, renderButton, renderDivider, formatCurrency, formatDate } from './base';
import {
  sanitizeCustomerName,
  sanitizeOrderId,
  sanitizeAddressLine,
  sanitizeProductText,
  sanitizeEmailUrl,
  ALLOWED_EMAIL_DOMAINS,
} from './sanitize';

export interface OrderConfirmationData {
  email: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: string;
    customization?: string;
  }>;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  estimatedDelivery: string;
  orderUrl: string;
}

/**
 * Render order confirmation email HTML
 * Applies security sanitization to all user-provided data
 */
export function renderOrderConfirmationHtml(data: OrderConfirmationData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl, ALLOWED_EMAIL_DOMAINS);
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
    <!-- Greeting -->
    <h2 style="margin: 0 0 10px 0; color: #3d2914; font-size: 22px; font-family: 'Georgia', serif;">
      Thank you for your order, ${sanitizedName}!
    </h2>
    <p style="margin: 0 0 20px 0; color: #5c4a3a; font-size: 15px; line-height: 1.6;">
      We've received your order and it's being prepared with care. You'll receive an email when your order ships.
    </p>

    <!-- Order Number -->
    <div style="background-color: #faf7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td>
            <p style="margin: 0 0 5px 0; color: #a08070; font-size: 13px;">Order Number</p>
            <p style="margin: 0; color: #3d2914; font-size: 18px; font-weight: 600;">${sanitizedOrderId}</p>
          </td>
          <td align="right">
            <p style="margin: 0 0 5px 0; color: #a08070; font-size: 13px;">Order Date</p>
            <p style="margin: 0; color: #3d2914; font-size: 16px;">${formatDate(data.orderDate)}</p>
          </td>
        </tr>
      </table>
    </div>

    ${renderDivider()}

    <!-- Order Items -->
    <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">Order Details</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0;">
      <thead>
        <tr>
          <th align="left" style="padding: 10px 0; color: #a08070; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e5ddd5;">Item</th>
          <th align="center" style="padding: 10px 0; color: #a08070; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e5ddd5;">Qty</th>
          <th align="right" style="padding: 10px 0; color: #a08070; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e5ddd5;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #f5f0eb;">
              <p style="margin: 0; color: #3d2914; font-size: 15px; font-weight: 500;">${sanitizeProductText(item.name)}</p>
              ${item.variant ? `<p style="margin: 3px 0 0 0; color: #a08070; font-size: 12px;">${sanitizeProductText(item.variant)}</p>` : ''}
              ${item.customization ? `<p style="margin: 3px 0 0 0; color: #8B4513; font-size: 12px;">Custom: ${sanitizeProductText(item.customization)}</p>` : ''}
            </td>
            <td align="center" style="padding: 15px 0; color: #5c4a3a; font-size: 15px; border-bottom: 1px solid #f5f0eb;">${item.quantity}</td>
            <td align="right" style="padding: 15px 0; color: #5c4a3a; font-size: 15px; border-bottom: 1px solid #f5f0eb;">${formatCurrency(item.price)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Order Summary -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
      <tr>
        <td style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">Subtotal</td>
        <td align="right" style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">${formatCurrency(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">Shipping</td>
        <td align="right" style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">${data.shippingAmount === 0 ? 'Free' : formatCurrency(data.shippingAmount)}</td>
      </tr>
      ${data.taxAmount > 0 ? `
      <tr>
        <td style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">Tax</td>
        <td align="right" style="padding: 5px 0; color: #5c4a3a; font-size: 14px;">${formatCurrency(data.taxAmount)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 15px 0; color: #3d2914; font-size: 16px; font-weight: 600; border-top: 2px solid #d4a574;">Total</td>
        <td align="right" style="padding: 15px 0; color: #D2691E; font-size: 18px; font-weight: 600; border-top: 2px solid #d4a574;">${formatCurrency(data.totalAmount)}</td>
      </tr>
    </table>

    ${renderDivider()}

    <!-- Shipping Address -->
    <h3 style="margin: 0 0 10px 0; color: #3d2914; font-size: 16px;">Shipping Address</h3>
    <p style="margin: 0 0 5px 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
      <strong>${sanitizedAddress.name}</strong><br>
      ${sanitizedAddress.line1}<br>
      ${sanitizedAddress.line2 ? `${sanitizedAddress.line2}<br>` : ''}
      ${sanitizedAddress.city}, ${sanitizedAddress.state} ${sanitizedAddress.postalCode}<br>
      ${sanitizedAddress.country}
    </p>

    <p style="margin: 15px 0 0 0; color: #a08070; font-size: 13px;">
      <strong>Payment Method:</strong> ${sanitizeProductText(data.paymentMethod)}
    </p>

    ${renderDivider()}

    <!-- Delivery Estimate -->
    <div style="background-color: #f8f4ef; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #5c4a3a; font-size: 14px;">
        <strong style="color: #3d2914;">Estimated Delivery:</strong> ${sanitizeProductText(data.estimatedDelivery)}
      </p>
    </div>

    ${sanitizedOrderUrl ? renderButton('Track Your Order', sanitizedOrderUrl) : ''}

    <p style="margin: 20px 0 0 0; color: #a08070; font-size: 13px; text-align: center;">
      If you have any questions, reply to this email or contact us at hello@kaari.in
    </p>
  `;

  return renderBaseTemplate({
    content: mainContent,
    previewText: `Your order #${sanitizedOrderId} has been confirmed! Estimated delivery: ${sanitizeProductText(data.estimatedDelivery)}`,
    showUnsubscribe: false,
  });
}

/**
 * Render order confirmation email plain text
 * Applies security sanitization to all user-provided data
 */
export function renderOrderConfirmationText(data: OrderConfirmationData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.customerName);
  const sanitizedOrderId = sanitizeOrderId(data.orderNumber);
  const sanitizedOrderUrl = sanitizeEmailUrl(data.orderUrl, ALLOWED_EMAIL_DOMAINS);

  const itemsList = data.items
    .map(item => `- ${sanitizeProductText(item.name)}${item.variant ? ` (${sanitizeProductText(item.variant)})` : ''} x${item.quantity} - ${formatCurrency(item.price)}`)
    .join('\n');

  const addressLines = [
    sanitizeCustomerName(data.shippingAddress.name),
    sanitizeAddressLine(data.shippingAddress.line1),
    data.shippingAddress.line2 ? sanitizeAddressLine(data.shippingAddress.line2) : null,
    `${sanitizeAddressLine(data.shippingAddress.city)}, ${sanitizeAddressLine(data.shippingAddress.state)} ${sanitizeAddressLine(data.shippingAddress.postalCode)}`,
    sanitizeAddressLine(data.shippingAddress.country),
  ].filter(Boolean).join('\n');

  return `
ORDER CONFIRMATION
Order #${sanitizedOrderId}

Dear ${sanitizedName},

Thank you for your order! We've received your order and it's being prepared with care.

ORDER DETAILS
${itemsList}

Subtotal: ${formatCurrency(data.subtotal)}
Shipping: ${data.shippingAmount === 0 ? 'Free' : formatCurrency(data.shippingAmount)}
${data.taxAmount > 0 ? `Tax: ${formatCurrency(data.taxAmount)}\n` : ''}
TOTAL: ${formatCurrency(data.totalAmount)}

SHIPPING ADDRESS
${addressLines}

Payment Method: ${sanitizeProductText(data.paymentMethod)}
Estimated Delivery: ${sanitizeProductText(data.estimatedDelivery)}

${sanitizedOrderUrl ? `Track your order: ${sanitizedOrderUrl}` : ''}

Questions? Contact us at hello@kaari.in

Thank you for shopping with Kaari!
`;
}