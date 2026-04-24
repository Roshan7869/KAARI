/**
 * Client-side logger — no Sentry, console-only.
 * Prevents Sentry SDK from being pulled into client bundles.
 */

type LogData = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  info(...args: unknown[]): void {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  warn(msg: string, data?: LogData): void {
    if (isDev) {
      console.warn('[WARN]', msg, data ?? '');
    } else {
      console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), msg, ...data }));
    }
  },

  error(msg: string, error?: unknown, data?: LogData): void {
    if (isDev) {
      console.error('[ERROR]', msg, error ?? '', data ?? '');
    } else {
      console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), msg, data }));
    }
  },
};

export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  if (isDev) {
    console.warn('[SECURITY]', event, details || '');
  } else {
    console.warn(JSON.stringify({ level: 'security', event, details, timestamp: new Date().toISOString() }));
  }
}

export function logAuditEvent(action: string, target: string, userId?: string): void {
  if (isDev) {
    console.log('[AUDIT]', { action, target, userId, timestamp: new Date().toISOString() });
  } else {
    console.log(JSON.stringify({ level: 'audit', action, target, userId, timestamp: new Date().toISOString() }));
  }
}

export default logger;
