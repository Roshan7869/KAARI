/**
 * Production-Safe Structured Logger
 *
 * - debug/info: Development only
 * - warn: Always logged
 * - error: Always logged — JSON format in production for Vercel log drain
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const isDev = process.env.NODE_ENV === 'development';

function formatArgs(level: LogLevel, ...args: unknown[]): unknown[] {
  return args;
}

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
    if (isDev) {
      console.warn('[WARN]', ...formatArgs('warn', ...args));
    } else {
      // Production: structured JSON for Vercel log drain
      console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), args }));
    }
  },

  error(...args: unknown[]): void {
    if (isDev) {
      console.error('[ERROR]', ...formatArgs('error', ...args));
    } else {
      // Production: always log errors — required for debugging payment/webhook issues
      console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), args }));
    }
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
