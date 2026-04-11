/**
 * Unit Tests for lib/logger.ts
 *
 * Tests for production-safe logging utility.
 * Target coverage: 80%
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  // Mock console methods
  const mockLog = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console
    vi.spyOn(console, 'log').mockImplementation(mockLog);
    vi.spyOn(console, 'info').mockImplementation(mockInfo);
    vi.spyOn(console, 'warn').mockImplementation(mockWarn);
    vi.spyOn(console, 'error').mockImplementation(mockError);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('in development mode', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      // Re-import logger to pick up new env
      vi.resetModules();
    });

    it('logs debug messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('Debug message', { key: 'value' });

      expect(mockLog).toHaveBeenCalled();
    });

    it('logs info messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('Info message', { key: 'value' });

      expect(mockInfo).toHaveBeenCalled();
    });

    it('logs warning messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.warn('Warning message', { key: 'value' });

      expect(mockWarn).toHaveBeenCalled();
    });

    it('logs error messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Error message', { key: 'value' });

      expect(mockError).toHaveBeenCalled();
    });

    it('formats log messages with prefix', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('Test message');

      const call = mockLog.mock.calls[0];
      expect(call[0]).toBe('[DEBUG]');
      expect(call[1]).toBe('Test message');
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.resetModules();
    });

    it('suppresses debug messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('Debug message');

      expect(mockLog).not.toHaveBeenCalled();
    });

    it('suppresses info messages', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('Info message');

      expect(mockInfo).not.toHaveBeenCalled();
    });

    it('always logs warnings', async () => {
      const { logger } = await import('@/lib/logger');
      logger.warn('Warning message');

      expect(mockWarn).toHaveBeenCalled();
    });

    it('suppresses error messages in production', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('Error message');

      // In current implementation, errors are silent in production
      expect(mockError).not.toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
    });

    it('logs security events in development', async () => {
      const { logSecurityEvent } = await import('@/lib/logger');
      logSecurityEvent('AUTH_FAILED', { ip: '192.168.1.1' });

      expect(mockWarn).toHaveBeenCalled();
    });

    it('includes event name and details', async () => {
      const { logSecurityEvent } = await import('@/lib/logger');
      logSecurityEvent('XSS_ATTEMPT', { input: '<script>' });

      const call = mockWarn.mock.calls[0];
      expect(call[0]).toBe('[SECURITY]');
      expect(call[1]).toBe('XSS_ATTEMPT');
    });
  });

  describe('logAuditEvent', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
    });

    it('logs audit events in development', async () => {
      const { logAuditEvent } = await import('@/lib/logger');
      logAuditEvent('PRODUCT_CREATE', 'product-123', 'user-456');

      expect(mockLog).toHaveBeenCalled();
    });

    it('includes action, target, and userId', async () => {
      const { logAuditEvent } = await import('@/lib/logger');
      logAuditEvent('ORDER_UPDATE', 'order-789', 'admin-123');

      const call = mockLog.mock.calls[0];
      expect(call[1]).toEqual({
        action: 'ORDER_UPDATE',
        target: 'order-789',
        userId: 'admin-123',
        timestamp: expect.any(String),
      });
    });

    it('works without userId', async () => {
      const { logAuditEvent } = await import('@/lib/logger');
      logAuditEvent('SETTINGS_UPDATE', 'settings');

      const call = mockLog.mock.calls[0];
      expect(call[1].action).toBe('SETTINGS_UPDATE');
      expect(call[1].target).toBe('settings');
    });
  });

  describe('multiple arguments', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
    });

    it('handles multiple arguments', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('User action', 'click', { button: 'submit' }, ['array', 'data']);

      expect(mockInfo).toHaveBeenCalled();
      const call = mockInfo.mock.calls[0];
      expect(call[0]).toBe('[INFO]');
      expect(call[1]).toBe('User action');
    });

    it('handles object arguments', async () => {
      const { logger } = await import('@/lib/logger');
      const obj = { nested: { deep: 'value' } };
      logger.debug('Object log', obj);

      expect(mockLog).toHaveBeenCalled();
    });

    it('handles error objects', async () => {
      const { logger } = await import('@/lib/logger');
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(mockError).toHaveBeenCalled();
    });
  });

  describe('formatArgs', () => {
    it('passes through arguments without modification', async () => {
      const { logger } = await import('@/lib/logger');
      const obj = { sensitive: 'data' };
      logger.info('Test', obj);

      // The current implementation passes through arguments
      // This test documents current behavior
      expect(mockInfo).toHaveBeenCalled();
    });
  });
});