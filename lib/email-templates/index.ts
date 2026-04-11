/**
 * Email Templates Index
 * Exports all email template functions for use in lib/email.ts
 */

// Base template utilities
export {
  renderBaseTemplate,
  renderBaseTextTemplate,
  renderButton,
  renderDivider,
  formatCurrency,
  formatDate,
} from './base';

// Security sanitization utilities
export {
  escapeHtml,
  escapeHtmlAttribute,
  sanitizeEmailUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeOrderId,
  sanitizeCurrency,
  sanitizeTrackingNumber,
  sanitizeCarrierName,
  sanitizeAddressLine,
  sanitizeCustomerName,
  sanitizeProductText,
  sanitizeErrorMessage,
  sanitizeEmailUrls,
  ALLOWED_EMAIL_DOMAINS,
} from './sanitize';

// Order confirmation
export {
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
} from './order-confirmation';
export type { OrderConfirmationData } from './order-confirmation';

// Welcome email
export {
  renderWelcomeHtml,
  renderWelcomeText,
} from './welcome';
export type { WelcomeData } from './welcome';

// Payment success
export {
  renderPaymentSuccessHtml,
  renderPaymentSuccessText,
} from './payment-success';
export type { PaymentSuccessData } from './payment-success';

// Payment failed
export {
  renderPaymentFailedHtml,
  renderPaymentFailedText,
} from './payment-failed';
export type { PaymentFailedData } from './payment-failed';

// Order shipped
export {
  renderOrderShippedHtml,
  renderOrderShippedText,
} from './order-shipped';
export type { OrderShippedData } from './order-shipped';

// Import types for type mappings
import type { OrderConfirmationData } from './order-confirmation';
import type { WelcomeData } from './welcome';
import type { PaymentSuccessData } from './payment-success';
import type { PaymentFailedData } from './payment-failed';
import type { OrderShippedData } from './order-shipped';

// Import render functions for switch statement
import {
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
} from './order-confirmation';
import { renderWelcomeHtml, renderWelcomeText } from './welcome';
import {
  renderPaymentSuccessHtml,
  renderPaymentSuccessText,
} from './payment-success';
import {
  renderPaymentFailedHtml,
  renderPaymentFailedText,
} from './payment-failed';
import {
  renderOrderShippedHtml,
  renderOrderShippedText,
} from './order-shipped';

/**
 * Template type mapping
 */
export type NotificationType =
  | 'order_confirmation'
  | 'welcome'
  | 'payment_success'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled';

/**
 * Template data mapping
 */
export interface TemplateDataMap {
  order_confirmation: OrderConfirmationData;
  welcome: WelcomeData;
  payment_success: PaymentSuccessData;
  payment_failed: PaymentFailedData;
  order_shipped: OrderShippedData;
  order_delivered: OrderConfirmationData;
  order_cancelled: OrderConfirmationData;
}

/**
 * Get the subject line for a notification type
 */
export function getSubjectForType(type: NotificationType, data: { orderNumber?: string }): string {
  const subjects: Record<NotificationType, string> = {
    order_confirmation: `Your Kaari Order #${data.orderNumber} has been placed!`,
    welcome: 'Welcome to Kaari!',
    payment_success: `Payment Successful - Order #${data.orderNumber}`,
    payment_failed: `Payment Failed - Order #${data.orderNumber}`,
    order_shipped: `Your Order #${data.orderNumber} has been shipped!`,
    order_delivered: `Your Order #${data.orderNumber} has been delivered!`,
    order_cancelled: `Order #${data.orderNumber} has been cancelled`,
  };

  return subjects[type];
}

/**
 * Render template for a notification type
 * Returns both HTML and plain text versions
 */
export function renderTemplate(
  type: NotificationType,
  data: TemplateDataMap[typeof type]
): { html: string; text: string; subject: string } {
  switch (type) {
    case 'order_confirmation': {
      const orderData = data as OrderConfirmationData;
      return {
        html: renderOrderConfirmationHtml(orderData),
        text: renderOrderConfirmationText(orderData),
        subject: getSubjectForType(type, { orderNumber: orderData.orderNumber }),
      };
    }

    case 'welcome': {
      const welcomeData = data as WelcomeData;
      return {
        html: renderWelcomeHtml(welcomeData),
        text: renderWelcomeText(welcomeData),
        subject: getSubjectForType(type, {}),
      };
    }

    case 'payment_success': {
      const successData = data as PaymentSuccessData;
      return {
        html: renderPaymentSuccessHtml(successData),
        text: renderPaymentSuccessText(successData),
        subject: getSubjectForType(type, { orderNumber: successData.orderNumber }),
      };
    }

    case 'payment_failed': {
      const failedData = data as PaymentFailedData;
      return {
        html: renderPaymentFailedHtml(failedData),
        text: renderPaymentFailedText(failedData),
        subject: getSubjectForType(type, { orderNumber: failedData.orderNumber }),
      };
    }

    case 'order_shipped': {
      const shippedData = data as OrderShippedData;
      return {
        html: renderOrderShippedHtml(shippedData),
        text: renderOrderShippedText(shippedData),
        subject: getSubjectForType(type, { orderNumber: shippedData.orderNumber }),
      };
    }

    case 'order_delivered': {
      const orderData = data as OrderConfirmationData;
      return {
        html: renderOrderConfirmationHtml(orderData),
        text: renderOrderConfirmationText(orderData),
        subject: getSubjectForType(type, { orderNumber: orderData.orderNumber }),
      };
    }

    case 'order_cancelled': {
      const orderData = data as OrderConfirmationData;
      return {
        html: renderOrderConfirmationHtml(orderData),
        text: renderOrderConfirmationText(orderData),
        subject: getSubjectForType(type, { orderNumber: orderData.orderNumber }),
      };
    }

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}