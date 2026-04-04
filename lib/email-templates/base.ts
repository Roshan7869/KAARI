/**
 * Base Email Template
 * Professional HTML email wrapper with Kaari branding
 * Uses inline CSS for email client compatibility
 *
 * SECURITY: All URLs passed to renderButton and renderBaseTemplate
 * should be sanitized using sanitizeEmailUrl from ./sanitize.ts
 */

import { sanitizeEmailUrl, ALLOWED_EMAIL_DOMAINS } from './sanitize';

export interface BaseTemplateData {
  content: string;
  previewText?: string;
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

/**
 * Generate the base HTML email structure
 * Uses inline styles for maximum email client compatibility
 *
 * SECURITY: Validates unsubscribe URL to prevent phishing
 */
export function renderBaseTemplate(data: BaseTemplateData): string {
  const { content, previewText, showUnsubscribe = false, unsubscribeUrl } = data;

  // SECURITY: Validate unsubscribe URL
  const sanitizedUnsubscribeUrl = showUnsubscribe && unsubscribeUrl
    ? sanitizeEmailUrl(unsubscribeUrl, ALLOWED_EMAIL_DOMAINS)
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, address=no, email=no, date=no, url=no">
  <title>Kaari</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f9f5f1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <!-- Preview Text (shown in email client list) -->
  ${previewText ? `<div style="display: none; font-size: 1px; color: #f9f5f1; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${previewText}</div>` : ''}

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f5f1;">
    <tr>
      <td style="padding: 20px 0;" align="center">
        <!-- Content Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <h1 style="margin: 0; color: #8B4513; font-size: 28px; font-weight: 600; font-family: 'Georgia', serif;">
                      <span style="color: #D2691E;">K</span>aari
                    </h1>
                    <p style="margin: 5px 0 0 0; color: #8B4513; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                      Handmade with Love
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background-color: #ffffff;" bgcolor="#ffffff">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-radius: 0 0 8px 8px; border-top: 1px solid #e5ddd5;" bgcolor="#ffffff">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <!-- Divider -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <div style="height: 1px; background: linear-gradient(to right, transparent, #d4a574, transparent);"></div>
                  </td>
                </tr>
                <!-- Footer Links -->
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <a href="https://kaari.shop" style="color: #8B4513; text-decoration: none; font-size: 14px; margin: 0 15px;">Shop</a>
                    <span style="color: #d4a574;">|</span>
                    <a href="https://kaari.shop/products" style="color: #8B4513; text-decoration: none; font-size: 14px; margin: 0 15px;">Products</a>
                    <span style="color: #d4a574;">|</span>
                    <a href="https://kaari.shop/about" style="color: #8B4513; text-decoration: none; font-size: 14px; margin: 0 15px;">About</a>
                  </td>
                </tr>
                <!-- Contact -->
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <p style="margin: 0; color: #8B4513; font-size: 13px;">
                      Questions? Reach out at
                      <a href="mailto:hello@kaari.shop" style="color: #D2691E; text-decoration: none;">hello@kaari.shop</a>
                    </p>
                  </td>
                </tr>
                <!-- Unsubscribe -->
                ${showUnsubscribe && sanitizedUnsubscribeUrl ? `
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #a08070; font-size: 12px;">
                      You're receiving this email because you made a purchase at Kaari.
                      <br>
                      <a href="${sanitizedUnsubscribeUrl}" style="color: #8B4513; text-decoration: underline;">Unsubscribe</a> from marketing emails.
                    </p>
                  </td>
                </tr>
                ` : ''}
                <!-- Copyright -->
                <tr>
                  <td align="center" style="padding-top: 15px;">
                    <p style="margin: 0; color: #a08070; font-size: 11px;">
                      &copy; ${new Date().getFullYear()} Kaari Handmade. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function renderBaseTextTemplate(content: string): string {
  return `
Kaari - Handmade with Love
================================

${content}

--------------------------------
Questions? Reach out at hello@kaari.shop

(c) ${new Date().getFullYear()} Kaari Handmade. All rights reserved.
https://kaari.shop
`;
}

/**
 * Email button component (inline styled)
 * SECURITY: URL is validated before rendering
 */
export function renderButton(text: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  // SECURITY: Validate URL - allow any valid http/https URL for buttons
  // (tracking links may be external carrier URLs)
  const sanitizedUrl = sanitizeEmailUrl(url);

  // Don't render button if URL is invalid
  if (!sanitizedUrl) {
    console.warn('Email button blocked: invalid URL', { url });
    return '';
  }

  const bgColor = variant === 'primary' ? '#D2691E' : '#f5f0eb';
  const textColor = variant === 'primary' ? '#ffffff' : '#8B4513';
  const borderColor = variant === 'primary' ? '#D2691E' : '#d4a574';

  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 25px auto;">
    <tr>
      <td style="border-radius: 6px; background-color: ${bgColor};">
        <a href="${sanitizedUrl}" style="display: inline-block; padding: 14px 28px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: ${textColor}; text-decoration: none; border: 1px solid ${borderColor}; border-radius: 6px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Divider component
 */
export function renderDivider(): string {
  return `<div style="height: 1px; background: linear-gradient(to right, transparent, #d4a574, transparent); margin: 25px 0;"></div>`;
}

/**
 * Format currency for email display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for email display
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}