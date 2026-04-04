/**
 * Resend Email Client
 *
 * A wrapper around Resend API for sending transactional emails.
 * This module provides:
 * - Configuration validation
 * - Email sending with retry logic
 * - Type-safe email payloads
 * - Security sanitization
 *
 * @see https://resend.com/docs/api-reference/emails/send-email
 */

import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

/**
 * Email tag for tracking and analytics
 */
export interface EmailTag {
  name: string;
  value: string;
}

/**
 * Email payload for sending via Resend
 */
export interface ResendEmailPayload {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Plain text version (optional, for email clients that don't render HTML) */
  text?: string;
  /** Sender email address (optional, defaults to NOTIFICATIONS_FROM_EMAIL) */
  from?: string;
  /** Reply-to email address (optional) */
  replyTo?: string;
  /** Tags for tracking and analytics (optional) */
  tags?: EmailTag[];
}

/**
 * Response from sending an email
 */
export interface ResendEmailResponse {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Resend email ID (only present on success) */
  id?: string;
  /** Error message (only present on failure) */
  error?: string;
  /** Seconds to wait before retrying (only present on rate limit) */
  retryAfter?: number;
}

/**
 * Configuration validation result (success case)
 */
export interface ResendConfigValid {
  isValid: true;
  apiKey: string;
  fromEmail: string;
}

/**
 * Configuration validation result (error case)
 */
export interface ResendConfigInvalid {
  isValid: false;
  error: string;
}

/**
 * Configuration validation result
 */
export type ResendConfigResult = ResendConfigValid | ResendConfigInvalid;

/**
 * Resend client interface for dependency injection
 */
export interface ResendClient {
  sendEmail: (payload: ResendEmailPayload) => Promise<ResendEmailResponse>;
  sendEmails: (payloads: ResendEmailPayload[]) => Promise<ResendEmailResponse[]>;
}

// ============================================
// Constants
// ============================================

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM_EMAIL = 'orders@kaari.shop';
const RESEND_KEY_PREFIX = 're_';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// Singleton client instance
let clientInstance: ResendClient | null = null;

// ============================================
// Configuration Validation
// ============================================

/**
 * Validate Resend configuration
 *
 * Checks that required environment variables are set and valid.
 *
 * @returns Validation result with error message if invalid
 */
export function validateResendConfig(): ResendConfigResult {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  // Check if API key is set
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      error: 'RESEND_API_KEY environment variable is not set. Please set it in your environment or Supabase Edge Function secrets.',
    };
  }

  // Validate API key format
  if (!apiKey.startsWith(RESEND_KEY_PREFIX)) {
    return {
      isValid: false,
      error: `Invalid RESEND_API_KEY format. API key must start with "${RESEND_KEY_PREFIX}".`,
    };
  }

  // Get from email (use default if not set)
  const fromEmail = process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  return {
    isValid: true,
    apiKey,
    fromEmail,
  };
}

// ============================================
// Email Validation
// ============================================

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate email payload before sending
 */
function validatePayload(payload: ResendEmailPayload): { isValid: true } | { isValid: false; error: string } {
  // Validate subject
  if (!payload.subject || payload.subject.trim() === '') {
    return { isValid: false, error: 'Subject is required' };
  }

  // Validate HTML content
  if (!payload.html || payload.html.trim() === '') {
    return { isValid: false, error: 'HTML content is required' };
  }

  // Validate recipient(s)
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      return { isValid: false, error: `Invalid email address: ${recipient}` };
    }
  }

  // Validate from email if specified
  if (payload.from && !isValidEmail(payload.from)) {
    return { isValid: false, error: `Invalid from email address: ${payload.from}` };
  }

  // Validate reply-to if specified
  if (payload.replyTo && !isValidEmail(payload.replyTo)) {
    return { isValid: false, error: `Invalid reply-to email address: ${payload.replyTo}` };
  }

  return { isValid: true };
}

// ============================================
// Security Sanitization
// ============================================

/**
 * Sanitize HTML content to prevent XSS
 * Removes script tags while preserving other content
 */
function sanitizeHtml(html: string): string {
  // Remove script tags
  return html.replace(SCRIPT_TAG_REGEX, '');
}

/**
 * Mask sensitive data in error messages
 * Prevents API keys from being logged
 */
function maskSensitiveData(message: string): string {
  // Mask anything that looks like an API key
  return message
    .replace(/re_[a-zA-Z0-9_]+/g, 're_****')
    .replace(/sk_live_[a-zA-Z0-9_]+/g, 'sk_live_****')
    .replace(/sk_test_[a-zA-Z0-9_]+/g, 'sk_test_****');
}

// ============================================
// Client Creation
// ============================================

/**
 * Create a Resend client instance
 *
 * Uses singleton pattern to reuse the client across calls.
 *
 * @returns ResendClient instance
 * @throws Error if API key is not configured
 */
export function createResendClient(): ResendClient {
  // Return cached instance if available
  if (clientInstance) {
    return clientInstance;
  }

  // Validate configuration
  const config = validateResendConfig();
  if (config.isValid === false) {
    // TypeScript now knows config is ResendConfigInvalid
    throw new Error(config.error);
  }

  // TypeScript now knows config is ResendConfigValid
  const validConfig = config;

  // Create client instance
  clientInstance = {
    sendEmail: async (payload: ResendEmailPayload): Promise<ResendEmailResponse> => {
      return sendEmailWithResendInternal(payload, validConfig);
    },
    sendEmails: async (payloads: ResendEmailPayload[]): Promise<ResendEmailResponse[]> => {
      const results = await Promise.allSettled(
        payloads.map((payload) => sendEmailWithResendInternal(payload, validConfig))
      );

      return results.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      });
    },
  };

  return clientInstance;
}

// ============================================
// Email Sending (Internal)
// ============================================

/**
 * Send email via Resend API (internal implementation)
 *
 * @param payload - Email payload
 * @param config - Validated configuration (must be valid)
 * @returns Response from Resend API
 */
async function sendEmailWithResendInternal(
  payload: ResendEmailPayload,
  config: ResendConfigValid
): Promise<ResendEmailResponse> {
  // Validate payload
  const validation = validatePayload(payload);
  if (!validation.isValid) {
    logger.error('Invalid email payload', { error: validation.error });
    return {
      success: false,
      error: validation.error,
    };
  }

  // Build request body
  const from = payload.from || config.fromEmail || DEFAULT_FROM_EMAIL;
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  const body: Record<string, unknown> = {
    from,
    to: recipients,
    subject: payload.subject,
    html: sanitizeHtml(payload.html),
  };

  // Add optional fields
  if (payload.text) {
    body.text = payload.text;
  }

  if (payload.replyTo) {
    body.reply_to = payload.replyTo;
  }

  if (payload.tags && payload.tags.length > 0) {
    body.tags = payload.tags;
  }

  try {
    logger.debug('Sending email via Resend', {
      to: recipients,
      subject: payload.subject,
      from,
    });

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        logger.warn('Resend rate limit exceeded', { retryAfter });

        return {
          success: false,
          error: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          retryAfter,
        };
      }

      const errorMessage = result.message || result.error || 'Failed to send email';
      const maskedError = maskSensitiveData(errorMessage);

      logger.error('Resend API error', {
        status: response.status,
        error: maskedError,
      });

      return {
        success: false,
        error: maskedError,
      };
    }

    logger.info('Email sent successfully', {
      id: result.id,
      to: recipients.join(', '),
    });

    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const maskedError = maskSensitiveData(errorMessage);

    logger.error('Exception while sending email', { error: maskedError });

    return {
      success: false,
      error: maskedError,
    };
  }
}

// ============================================
// Public API
// ============================================

/**
 * Send an email via Resend API
 *
 * This is the main entry point for sending emails.
 * Uses the Resend REST API directly without the SDK for simplicity.
 *
 * @param payload - Email payload
 * @returns Response from Resend API
 *
 * @example
 * ```ts
 * const result = await sendEmailWithResend({
 *   to: 'customer@example.com',
 *   subject: 'Order Confirmation',
 *   html: '<h1>Your Order</h1>',
 *   text: 'Your Order',
 * });
 *
 * if (result.success) {
 *   console.log('Email sent:', result.id);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export async function sendEmailWithResend(payload: ResendEmailPayload): Promise<ResendEmailResponse> {
  const config = validateResendConfig();

  if (config.isValid === false) {
    // TypeScript now knows config is ResendConfigInvalid
    logger.error('Resend configuration invalid', { error: config.error });
    return {
      success: false,
      error: config.error,
    };
  }

  // TypeScript now knows config is ResendConfigValid
  return sendEmailWithResendInternal(payload, config);
}

/**
 * Reset the singleton client (useful for testing)
 */
export function resetClient(): void {
  clientInstance = null;
}
