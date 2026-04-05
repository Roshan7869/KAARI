/**
 * Environment Configuration
 *
 * Type-safe access to environment variables with validation.
 * Variables prefixed with VITE_ are exposed to client-side code.
 *
 * SECURITY NOTE:
 * - Never put secrets in VITE_ prefixed variables
 * - API keys for payment gateways should be server-side only (Edge Functions)
 */

// Define required and optional environment variables
interface EnvConfig {
  // Required - Supabase configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectId: string;

  // Optional - Feature flags
  cashfreeTestMode: boolean;
  enableAnalytics: boolean;
  enableDevTools: boolean;

  // Runtime detection
  isDevelopment: boolean;
  isProduction: boolean;
}

// Validation result
interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Get environment variable with type safety
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = import.meta.env[key];
  return value ?? defaultValue;
}

/**
 * Check if a VITE_ variable should NOT be exposed client-side
 */
const SERVER_ONLY_PATTERNS = [
  'VITE_CASHFREE_SECRET_KEY',
  'VITE_CASHFREE_APP_ID',
  'VITE_CASHFREE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_KEY',
  'SERVICE_KEY',
  'SECRET',
  'PASSWORD',
];

/**
 * Validate environment configuration
 * Call this at app startup to catch missing variables early
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PROJECT_ID',
  ];

  for (const key of required) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  // Check for server-only patterns in VITE_ variables
  for (const [key, value] of Object.entries(import.meta.env)) {
    if (key.startsWith('VITE_') && value) {
      for (const pattern of SERVER_ONLY_PATTERNS) {
        if (key.includes(pattern) || key.endsWith(pattern)) {
          warnings.push(
            `SECURITY WARNING: ${key} appears to contain sensitive data and is exposed client-side. Move to Edge Functions.`
          );
        }
      }
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    warnings.push('VITE_SUPABASE_URL should start with https://');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Environment configuration object
 * Throws if required variables are missing (when accessed, not at import time)
 */
export const config: EnvConfig = {
  get supabaseUrl(): string {
    const url = getEnvVar('VITE_SUPABASE_URL');
    if (!url) throw new Error('VITE_SUPABASE_URL is required');
    return url;
  },

  get supabaseAnonKey(): string {
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');
    if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is required');
    return key;
  },

  get supabaseProjectId(): string {
    const id = getEnvVar('VITE_SUPABASE_PROJECT_ID');
    if (!id) {
      // Try to extract from URL
      const url = this.supabaseUrl;
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match) return match[1];
      throw new Error('VITE_SUPABASE_PROJECT_ID is required');
    }
    return id;
  },

  get cashfreeTestMode(): boolean {
    return getEnvVar('VITE_CASHFREE_TEST_MODE') === 'true';
  },

  get enableAnalytics(): boolean {
    return getEnvVar('VITE_ENABLE_ANALYTICS') === 'true';
  },

  get enableDevTools(): boolean {
    return getEnvVar('VITE_ENABLE_DEVTOOLS') === 'true';
  },

  get isDevelopment(): boolean {
    return import.meta.env.DEV;
  },

  get isProduction(): boolean {
    return import.meta.env.PROD;
  },
};

/**
 * Log environment validation results
 * Only logs in development mode
 */
export function logEnvStatus(): void {
  if (!import.meta.env.DEV) return;

  const result = validateEnv();

  if (result.missing.length > 0) {
    console.error('Missing required environment variables:', result.missing);
  }

  if (result.warnings.length > 0) {
    console.warn('Environment configuration warnings:');
    result.warnings.forEach(w => console.warn('  ⚠️', w));
  }

  if (result.valid) {
    console.log('✅ Environment configuration valid');
  }
}

// Export types
export type { EnvConfig, ValidationResult };