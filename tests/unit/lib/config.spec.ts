/**
 * Unit Tests for lib/config.ts
 *
 * Tests for environment configuration validation.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset process.env
    process.env = { ...originalEnv };
    // Set required env vars for most tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID = 'test-project';
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('validateEnv', () => {
    it('validates required environment variables', async () => {
      // Set all required variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID = 'project';

      const { validateEnv } = await import('@/lib/config');
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('detects missing required variables', async () => {
      // Clear required variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;

      const { validateEnv } = await import('@/lib/config');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_PROJECT_ID');
    });

    it('warns about secrets in NEXT_PUBLIC_ variables', async () => {
      // Set a variable that looks like a secret
      process.env.NEXT_PUBLIC_API_SECRET = 'secret-value';

      const { validateEnv } = await import('@/lib/config');
      const result = validateEnv();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('SECURITY WARNING');
      expect(result.warnings[0]).toContain('NEXT_PUBLIC_API_SECRET');
    });

    it('warns about non-https Supabase URL', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';

      const { validateEnv } = await import('@/lib/config');
      const result = validateEnv();

      expect(result.warnings).toContainEqual(
        expect.stringContaining('https://')
      );
    });

    it('accepts valid https Supabase URL', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid.supabase.co';

      const { validateEnv } = await import('@/lib/config');
      const result = validateEnv();

      // Should not have https warning
      const httpsWarning = result.warnings.find(w => w.includes('https://'));
      expect(httpsWarning).toBeUndefined();
    });
  });

  describe('config', () => {
    it('returns supabaseUrl', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://my-project.supabase.co';

      const { config } = await import('@/lib/config');
      expect(config.supabaseUrl).toBe('https://my-project.supabase.co');
    });

    it('returns supabaseAnonKey', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'my-anon-key';

      const { config } = await import('@/lib/config');
      expect(config.supabaseAnonKey).toBe('my-anon-key');
    });

    it('falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';

      const { config } = await import('@/lib/config');
      expect(config.supabaseAnonKey).toBe('publishable-key');
    });

    it('throws when supabaseUrl is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { config } = await import('@/lib/config');
      expect(() => config.supabaseUrl).toThrow('NEXT_PUBLIC_SUPABASE_URL is required');
    });

    it('throws when supabaseAnonKey is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const { config } = await import('@/lib/config');
      expect(() => config.supabaseAnonKey).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    });

    it('returns supabaseProjectId from env', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID = 'my-project-id';

      const { config } = await import('@/lib/config');
      expect(config.supabaseProjectId).toBe('my-project-id');
    });

    it('extracts projectId from URL if not in env', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://extract-project.supabase.co';

      const { config } = await import('@/lib/config');
      expect(config.supabaseProjectId).toBe('extract-project');
    });

    it('throws when projectId cannot be determined', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://invalid-url.com';

      const { config } = await import('@/lib/config');
      expect(() => config.supabaseProjectId).toThrow('NEXT_PUBLIC_SUPABASE_PROJECT_ID is required');
    });

    it('returns cashfreeTestMode as true', async () => {
      process.env.NEXT_PUBLIC_CASHFREE_TEST_MODE = 'true';

      const { config } = await import('@/lib/config');
      expect(config.cashfreeTestMode).toBe(true);
    });

    it('returns cashfreeTestMode as false by default', async () => {
      delete process.env.NEXT_PUBLIC_CASHFREE_TEST_MODE;

      const { config } = await import('@/lib/config');
      expect(config.cashfreeTestMode).toBe(false);
    });

    it('returns enableAnalytics as true', async () => {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';

      const { config } = await import('@/lib/config');
      expect(config.enableAnalytics).toBe(true);
    });

    it('returns enableAnalytics as false by default', async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;

      const { config } = await import('@/lib/config');
      expect(config.enableAnalytics).toBe(false);
    });

    it('returns enableDevTools as true', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS = 'true';

      const { config } = await import('@/lib/config');
      expect(config.enableDevTools).toBe(true);
    });

    it('returns isDevelopment as true in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const { config } = await import('@/lib/config');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('returns isProduction as true in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { config } = await import('@/lib/config');
      expect(config.isProduction).toBe(true);
      expect(config.isDevelopment).toBe(false);
    });

    it('returns appUrl from env', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';

      const { config } = await import('@/lib/config');
      expect(config.appUrl).toBe('https://myapp.com');
    });

    it('returns default appUrl if not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const { config } = await import('@/lib/config');
      expect(config.appUrl).toBe('http://localhost:3000');
    });
  });

  describe('logEnvStatus', () => {
    it('logs missing variables in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { logEnvStatus } = await import('@/lib/config');
      const { logger } = await import('@/lib/logger');

      logEnvStatus();

      expect(logger.error).toHaveBeenCalled();
    });

    it('logs warnings in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      process.env.NEXT_PUBLIC_SECRET_KEY = 'secret';

      const { logEnvStatus } = await import('@/lib/config');
      const { logger } = await import('@/lib/logger');

      logEnvStatus();

      expect(logger.warn).toHaveBeenCalled();
    });

    it('logs success when valid', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID = 'project';

      const { logEnvStatus } = await import('@/lib/config');
      const { logger } = await import('@/lib/logger');

      logEnvStatus();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Environment configuration valid')
      );
    });

    it('does not log in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { logEnvStatus } = await import('@/lib/config');
      const { logger } = await import('@/lib/logger');

      logEnvStatus();

      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});