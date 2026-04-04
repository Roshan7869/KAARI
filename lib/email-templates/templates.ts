/**
 * Email Templates
 *
 * Template system for sending transactional emails with HTML and plain text versions.
 * Supports dynamic content injection using Mustache-style {{placeholders}}.
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  requires?: string[]; // Required variables
}

interface EmailData {
  [key: string]: string | number | boolean;
}

// Base template with common elements
const BASE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9fafb; border-radius: 10px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #4a4a4a; margin: 0; }
    .content { background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 10px 0; }
    .btn:hover { background: #7C3AED; }
    .note { font-size: 14px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kaari Marketplace</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      <p>This is an automated message from Kaari Marketplace.</p>
      <p>Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

const BASE_TEXT = `
{{subject}}

{{content}}

This is an automated message from Kaari Marketplace.
Please do not reply directly to this email.
`.trim();

// Template registry
export const EMAIL_TEMPLATES: Record<string, Omit<EmailTemplate, 'html' | 'text'>> = {
  orderConfirmation: {
    subject: 'Order Confirmation #{{orderNumber}} - Kaari Marketplace',
  },
  orderShipped: {
    subject: 'Your Order {{orderNumber}} Has Shipped - Kaari Marketplace',
  },
  orderDelivered: {
    subject: 'Your Order {{orderNumber}} Was Delivered - Kaari Marketplace',
  },
  paymentSuccess: {
    subject: 'Payment Successful - Kaari Marketplace',
  },
  paymentFailed: {
    subject: 'Payment Failed - Kaari Marketplace',
  },
  welcome: {
    subject: 'Welcome to Kaari Marketplace!',
  },
  passwordReset: {
    subject: 'Reset Your Password - Kaari Marketplace',
  },
  shippingNotification: {
    subject: 'Shipping Update for Order {{orderNumber}} - Kaari Marketplace',
  },
  adminNewOrder: {
    subject: 'New Order Received - Kaari Marketplace',
  },
  adminLowStock: {
    subject: 'Low Stock Alert - Kaari Marketplace',
  },
};

// Template content generators
export function getOrderConfirmationTemplate(data: {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shippingCharge: number;
  total: number;
  shippingAddress: string;
}): EmailTemplate {
  const itemsHtml = data.items.map(item =>
    `<tr><td style="padding: 8px 0;">${item.name} (x${item.quantity})</td><td style="padding: 8px 0; text-align: right;">₹${item.price}</td></tr>`
  ).join('');

  const content = `
    <h2>Thank you for your order!</h2>
    <p>Hi ${data.customerName},</p>
    <p>Your order <strong>#${data.orderNumber}</strong> has been placed successfully.</p>

    <h3>Order Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsHtml}
      <tr style="border-top: 2px solid #ddd;"><td><strong>Subtotal</strong></td><td style="text-align: right;"><strong>₹${data.subtotal}</strong></td></tr>
      <tr><td>Shipping</td><td style="text-align: right;">₹${data.shippingCharge}</td></tr>
      <tr style="border-top: 2px solid #ddd;"><td><strong>Total</strong></td><td style="text-align: right;"><strong>₹${data.total}</strong></td></tr>
    </table>

    <h3>Shipping Address</h3>
    <p>${data.shippingAddress}</p>

    <p>Order Date: ${data.orderDate}</p>

    <p>You will receive an email when your order ships.</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{orderUrl}}" class="btn">View Order Details</a>
    </div>

    <p class="note">If you have any questions about your order, please contact us at support@kaari.in</p>
  `;

  return {
    subject: `Order Confirmation #${data.orderNumber} - Kaari Marketplace`,
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Order Confirmation #${data.orderNumber}
========================================

Hi ${data.customerName},

Thank you for your order!

Order Summary:
${data.items.map(item => `${item.name} (x${item.quantity}): ₹${item.price}`).join('\n')}

Subtotal: ₹${data.subtotal}
Shipping: ₹${data.shippingCharge}
Total: ₹${data.total}

Shipping to:
${data.shippingAddress}

Order Date: ${data.orderDate}

You will receive an email when your order ships.

If you have any questions about your order, please contact us at support@kaari.in
`.trim(),
  };
}

export function getWelcomeTemplate(data: {
  customerName: string;
  email: string;
}): EmailTemplate {
  const content = `
    <h2>Welcome to Kaari Marketplace!</h2>
    <p>Hi ${data.customerName},</p>
    <p>Thank you for creating an account with us. We're excited to have you as part of our community of handmade crochet enthusiasts.</p>

    <p>With your account, you can:</p>
    <ul>
      <li>Track your orders in real-time</li>
      <li>Save items to your wishlist</li>
      <li>Create custom designs</li>
      <li>Get exclusive offers and updates</li>
    </ul>

    <p>Start exploring our collection of beautiful handmade products:</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{shopUrl}}" class="btn">Start Shopping</a>
    </div>

    <p class="note">If you have any questions, our support team is here to help!</p>
  `;

  return {
    subject: 'Welcome to Kaari Marketplace!',
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Welcome to Kaari Marketplace!
=============================

Hi ${data.customerName},

Thank you for creating an account with us. We're excited to have you as part of our community of handmade crochet enthusiasts.

With your account, you can:
- Track your orders in real-time
- Save items to your wishlist
- Create custom designs
- Get exclusive offers and updates

Start exploring our collection of beautiful handmade products:
https://kaari.in/shop

If you have any questions, our support team is here to help!
`.trim(),
  };
}

export function getPaymentSuccessTemplate(data: {
  orderNumber: string;
  amount: number;
  paymentDate: string;
}): EmailTemplate {
  const content = `
    <h2>Payment Successful!</h2>
    <p>Thank you for your payment for order #${data.orderNumber}.</p>
    <p><strong>Amount Paid: ₹${data.amount}</strong></p>
    <p>Payment Date: ${data.paymentDate}</p>
    <p>Your order is now being processed.</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{orderUrl}}" class="btn">View Order Status</a>
    </div>
  `;

  return {
    subject: `Payment Successful - Order #${data.orderNumber}`,
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Payment Successful!
===================

Thank you for your payment for order #${data.orderNumber}.

Amount Paid: ₹${data.amount}
Payment Date: ${data.paymentDate}

Your order is now being processed.

View Order Status: {{orderUrl}}
`.trim(),
  };
}

export function getPaymentFailedTemplate(data: {
  orderNumber: string;
  amount: number;
  failureReason: string;
}): EmailTemplate {
  const content = `
    <h2>Payment Failed</h2>
    <p>We were unable to process your payment for order #${data.orderNumber}.</p>
    <p><strong>Amount: ₹${data.amount}</strong></p>
    <p><strong>Reason:</strong> ${data.failureReason}</p>

    <p>Please try again or contact our support team for assistance.</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{retryUrl}}" class="btn">Retry Payment</a>
    </div>
  `;

  return {
    subject: `Payment Failed - Order #${data.orderNumber}`,
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Payment Failed
==============

We were unable to process your payment for order #${data.orderNumber}.

Amount: ₹${data.amount}
Reason: ${data.failureReason}

Please try again or contact our support team for assistance.

Retry Payment: {{retryUrl}}
`.trim(),
  };
}

export function getShippingNotificationTemplate(data: {
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  shippingAddress: string;
  items: Array<{ name: string; quantity: number }>;
}): EmailTemplate {
  const itemsHtml = data.items.map(item => `${item.name} (x${item.quantity})`).join(', ');

  const content = `
    <h2>Your Order Has Shipped!</h2>
    <p>Order #${data.orderNumber} has been shipped.</p>

    <h3>Tracking Information</h3>
    <p><strong>Carrier:</strong> ${data.carrier}</p>
    <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
    <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{trackingUrl}}" class="btn">Track Package</a>
    </div>

    <h3>Items in This Order</h3>
    <p>${itemsHtml}</p>
  `;

  return {
    subject: `Your Order #${data.orderNumber} Has Shipped`,
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Your Order Has Shipped!
======================

Order #${data.orderNumber} has been shipped.

Tracking Information:
Carrier: ${data.carrier}
Tracking Number: ${data.trackingNumber}
Estimated Delivery: ${data.estimatedDelivery}

Items: ${itemsHtml}

Track Package: {{trackingUrl}}
`.trim(),
  };
}

export function getLowStockAlertTemplate(data: {
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  productUrl: string;
}): EmailTemplate {
  const content = `
    <h2>Low Stock Alert</h2>
    <p><strong>Product:</strong> ${data.productName}</p>
    <p><strong>SKU:</strong> ${data.sku}</p>
    <p><strong>Current Stock:</strong> ${data.currentStock}</p>
    <p><strong>Restock Threshold:</strong> ${data.threshold}</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="{{productUrl}}" class="btn">View Product</a>
    </div>
  `;

  return {
    subject: `Low Stock Alert: ${data.productName}`,
    html: BASE_HTML.replace('{{content}}', content),
    text: `
Low Stock Alert
===============

Product: ${data.productName}
SKU: ${data.sku}
Current Stock: ${data.currentStock}
Restock Threshold: ${data.threshold}

View Product: ${data.productUrl}
`.trim(),
  };
}

// Template renderer
export function renderTemplate(template: EmailTemplate, data: EmailData): EmailTemplate {
  const replacePlaceholders = (text: string): string => {
    return text.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : '';
    });
  };

  return {
    subject: replacePlaceholders(template.subject),
    html: replacePlaceholders(template.html),
    text: replacePlaceholders(template.text),
  };
}

// Email validator
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Email options interface
export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{ name: string; content: string; contentType?: string }>;
}

export type NotificationChannel = 'email' | 'sms' | 'push';
