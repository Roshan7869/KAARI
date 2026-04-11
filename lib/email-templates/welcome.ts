/**
 * Welcome Email Template
 * Sent when a new user signs up
 *
 * SECURITY: All user-provided data is sanitized to prevent XSS/injection attacks
 */

import { renderBaseTemplate, renderButton, renderDivider } from './base';
import {
  sanitizeCustomerName,
  sanitizeEmailUrl,
  ALLOWED_EMAIL_DOMAINS,
} from './sanitize';

export interface WelcomeData {
  userName: string;
  email: string;
  shopUrl: string;
  supportEmail: string;
}

/**
 * Render welcome email HTML
 * Applies security sanitization to all user-provided data
 */
export function renderWelcomeHtml(data: WelcomeData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.userName);
  const sanitizedShopUrl = sanitizeEmailUrl(data.shopUrl, ALLOWED_EMAIL_DOMAINS);

  const mainContent = `
    <!-- Greeting -->
    <h2 style="margin: 0 0 10px 0; color: #3d2914; font-size: 24px; font-family: 'Georgia', serif;">
      Welcome to Kaari, ${sanitizedName}!
    </h2>
    <p style="margin: 0 0 20px 0; color: #5c4a3a; font-size: 15px; line-height: 1.6;">
      Thank you for joining our community of handmade crochet lovers. We're thrilled to have you with us!
    </p>

    <!-- What to Expect -->
    <div style="background-color: #faf7f4; border-radius: 8px; padding: 25px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #3d2914; font-size: 16px;">What's Next?</h3>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 10px 0;">
            <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
              <span style="color: #D2691E; font-weight: 600;">Explore our collection</span><br>
              Browse our curated selection of handmade crochet products, each crafted with love and care.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
              <span style="color: #D2691E; font-weight: 600;">Custom orders</span><br>
              Looking for something unique? We offer customization options for many of our products.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
              <span style="color: #D2691E; font-weight: 600;">Stay connected</span><br>
              Follow our journey and get inspired by our latest creations and behind-the-scenes stories.
            </p>
          </td>
        </tr>
      </table>
    </div>

    ${renderDivider()}

    <!-- Our Story -->
    <h3 style="margin: 0 0 10px 0; color: #3d2914; font-size: 16px;">Our Story</h3>
    <p style="margin: 0 0 20px 0; color: #5c4a3a; font-size: 14px; line-height: 1.7;">
      Kaari was born from a passion for handmade crafts. Every piece in our collection is lovingly created by skilled artisans,
      bringing warmth and personality to your home. When you buy from Kaari, you're supporting traditional craftsmanship and
      the talented hands behind each creation.
    </p>

    ${sanitizedShopUrl ? renderButton('Start Shopping', sanitizedShopUrl) : ''}

    ${renderDivider()}

    <!-- Support -->
    <h3 style="margin: 0 0 10px 0; color: #3d2914; font-size: 16px;">Need Help?</h3>
    <p style="margin: 0; color: #5c4a3a; font-size: 14px; line-height: 1.6;">
      Our team is here to help! If you have any questions about our products, customization options, or your order,
      don't hesitate to reach out.
    </p>
    <p style="margin: 10px 0 0 0;">
      <a href="mailto:${data.supportEmail}" style="color: #D2691E; text-decoration: none; font-size: 14px;">
        Contact Support
      </a>
    </p>

    <!-- Email Preferences Notice -->
    <div style="margin-top: 30px; padding: 15px; background-color: #f8f4ef; border-radius: 8px;">
      <p style="margin: 0; color: #a08070; font-size: 12px; line-height: 1.6;">
        You'll receive order confirmations and important updates via email.
        You can manage your notification preferences in your account settings.
      </p>
    </div>
  `;

  // Generate unsubscribe URL
  const unsubscribeUrl = sanitizedShopUrl ? `${sanitizedShopUrl}/account/preferences` : '';

  return renderBaseTemplate({
    content: mainContent,
    previewText: `Welcome to Kaari! Explore our collection of handmade crochet products.`,
    showUnsubscribe: true,
    unsubscribeUrl,
  });
}

/**
 * Render welcome email plain text
 * Applies security sanitization to all user-provided data
 */
export function renderWelcomeText(data: WelcomeData): string {
  // SECURITY: Sanitize all user-provided data
  const sanitizedName = sanitizeCustomerName(data.userName);
  const sanitizedShopUrl = sanitizeEmailUrl(data.shopUrl, ALLOWED_EMAIL_DOMAINS);

  return `
WELCOME TO KAARI
================

Dear ${sanitizedName},

Thank you for joining our community of handmade crochet lovers! We're thrilled to have you with us.

WHAT'S NEXT?

1. Explore our collection
   Browse our curated selection of handmade crochet products, each crafted with love and care.

2. Custom orders
   Looking for something unique? We offer customization options for many of our products.

3. Stay connected
   Follow our journey and get inspired by our latest creations and behind-the-scenes stories.

OUR STORY

Kaari was born from a passion for handmade crafts. Every piece in our collection is lovingly created by skilled artisans, bringing warmth and personality to your home. When you buy from Kaari, you're supporting traditional craftsmanship and the talented hands behind each creation.

${sanitizedShopUrl ? `Start shopping: ${sanitizedShopUrl}` : ''}

NEED HELP?

Our team is here to help! Contact us at ${data.supportEmail}

You'll receive order confirmations and important updates via email.
You can manage your notification preferences in your account settings.

Thank you for joining Kaari!
`;
}