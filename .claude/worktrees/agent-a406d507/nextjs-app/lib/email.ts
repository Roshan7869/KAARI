/**
 * Email Notification Service
 * Future integration point for Resend, SendGrid, or Mailgun
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
  estimatedDelivery: string;
}

/**
 * Send order confirmation email
 * TODO: Integrate with Resend, SendGrid, or Mailgun
 */
export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  const html = `
    <h1>Order Confirmation</h1>
    <p>Dear ${data.customerName},</p>
    <p>Thank you for your order! Here are your order details:</p>

    <h2>Order #${data.orderId}</h2>
    <p>Date: ${data.orderDate}</p>

    <h3>Items:</h3>
    <ul>
      ${data.items.map(item => `
        <li>${item.name} x${item.quantity} - ₹${item.price}</li>
      `).join('')}
    </ul>

    <p><strong>Total: ₹${data.total}</strong></p>

    <h3>Delivery Address:</h3>
    <p>${data.deliveryAddress}</p>

    <p>Estimated Delivery: ${data.estimatedDelivery}</p>

    <p>Thank you for shopping with Kaari Marketplace!</p>
  `;

  const emailOptions: EmailOptions = {
    to: data.customerEmail,
    subject: `Order Confirmation - Order #${data.orderId}`,
    html,
    text: `Order Confirmation\n\nOrder #${data.orderId}\nTotal: ₹${data.total}`,
  };

  // TODO: Implement with your email service
  console.log('📧 Order confirmation email would be sent:', emailOptions);

  // Example implementation:
  // const response = await fetch('/api/email/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(emailOptions),
  // });
  //
  // if (!response.ok) {
  //   throw new Error('Failed to send email');
  // }
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotificationEmail(
  customerEmail: string,
  orderId: string,
  trackingNumber: string
): Promise<void> {
  const html = `
    <h1>Your order has been shipped!</h1>
    <p>Your order #${orderId} is on its way.</p>
    <p>Tracking Number: ${trackingNumber}</p>
  `;

  console.log('📧 Shipping notification would be sent:', { customerEmail, orderId, trackingNumber });
  // TODO: Implement with your email service
}

/**
 * Send promotional email
 */
export async function sendPromotionalEmail(
  customerEmail: string,
  subject: string,
  html: string
): Promise<void> {
  console.log('📧 Promotional email would be sent:', { customerEmail, subject });
  // TODO: Implement with your email service
}
