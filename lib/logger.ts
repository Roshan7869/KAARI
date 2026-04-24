/**
 * Production-Safe Structured Logger with Sentry Integration
 *
 * - debug/info: Development only
 * - warn: Always logged + Sentry breadcrumb
 * - error: Always logged + Sentry captureException
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogData = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

function formatArgs(level: LogLevel, ...args: unknown[]): unknown[] {
  return args;
}

export const logger = {
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

  warn(msg: string, data?: LogData): void {
    if (isDev) {
      console.warn('[WARN]', msg, data ?? '');
    } else {
      console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), msg, ...data }));
    }
    Sentry.addBreadcrumb({ level: 'warning', message: msg, data });
  },

  error(msg: string, error?: unknown, data?: LogData): void {
    if (isDev) {
      console.error('[ERROR]', msg, error ?? '', data ?? '');
    } else {
      console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), msg, data }));
    }
    Sentry.captureException(error instanceof Error ? error : new Error(msg), {
      extra: { msg, ...data },
    });
  },
};

/**
 * Log security-related events — always logged server-side
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  if (isDev) {
    console.warn('[SECURITY]', event, details || '');
  } else {
    console.warn(JSON.stringify({ level: 'security', event, details, timestamp: new Date().toISOString() }));
  }
}

/**
 * Log audit events for admin actions
 */
export function logAuditEvent(action: string, target: string, userId?: string): void {
  if (isDev) {
    console.log('[AUDIT]', { action, target, userId, timestamp: new Date().toISOString() });
  } else {
    console.log(JSON.stringify({ level: 'audit', action, target, userId, timestamp: new Date().toISOString() }));
  }
}

export default logger;