/**
 * Single source of truth for all app-wide constants.
 * Import from here instead of hardcoding values.
 */

/** WhatsApp number for customer support */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '917869613579';

/** Business email */
export const BUSINESS_EMAIL = process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? 'hello@kaari.in';

/** App domain (without protocol) */
export const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in').replace(/^https?:\/\//, '');

/** App URL (with protocol) */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in').trim();

/** From email for transactional emails */
export const FROM_EMAIL = `orders@${APP_DOMAIN}`;

/** Business address */
export const BUSINESS_ADDRESS = {
  line1: 'Bhopal',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462016',
  country: 'India',
} as const;