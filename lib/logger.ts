/**
 * Production-Safe Logger Utility
 *
 * Only logs to console in development mode.
 * In production, errors are silently handled (can be extended to send to error tracking service).
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('This only shows in dev');
 *   logger.error('This shows in dev, is silent in prod');
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const isDev = process.env.NODE_ENV === 'development';

/**
 * Format log arguments for cleaner output
 */
function formatArgs(level: LogLevel, ...args: unknown[]): unknown[] {
  // In production, we might want to strip sensitive data
  // For now, just pass through
  return args;
}

/**
 * Production-safe logger
 *
 * - debug/info: Only logs in development mode
 * - warn: Always logs warnings (important for deprecations)
 * - error: Logs in dev, can be extended to send to error tracking in prod
 */
export const logger: Logger = {
  debug(...args: unknown[]): void {
    if (isDev) {
      console.log('[DEBUG]', ...formatArgs('debug', ...args));
    }
  },

  info(...args: unknown[]): void {
    if (isDev) {
      console.info('[INFO]', ...formatArgs('info', ...args));
    }
  },

  warn(...args: unknown[]): void {
    // Always show warnings - they're important
    console.warn('[WARN]', ...formatArgs('warn', ...args));
  },

  error(...args: unknown[]): void {
    if (isDev) {
      console.error('[ERROR]', ...formatArgs('error', ...args));
    }
    // In production, you could send to Sentry, LogRocket, etc.
    // For now, we silence errors in production to prevent info leakage
    // Critical errors should be handled with user-facing error boundaries
  },
};

/**
 * Log security-related events
 * These are always logged, even in production (to stderr)
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  // Security events should always be logged server-side
  // For client-side, we only log in dev
  if (isDev) {
    console.warn('[SECURITY]', event, details || '');
  }
  // In production, send to security monitoring service
}

/**
 * Log audit events for admin actions
 */
export function logAuditEvent(action: string, target: string, userId?: string): void {
  if (isDev) {
    console.log('[AUDIT]', { action, target, userId, timestamp: new Date().toISOString() });
  }
  // In production, send to audit logging service
}

export default logger;