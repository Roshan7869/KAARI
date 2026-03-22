/**
 * Environment Configuration for Next.js
 *
 * Type-safe access to environment variables with validation.
 * Uses NEXT_PUBLIC_ prefix for client-side variables.
 *
 * SECURITY NOTE:
 * - Never put secrets in NEXT_PUBLIC_ prefixed variables
 * - API keys for payment gateways should be server-side only
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
  appUrl: string;
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
  return process.env[key] ?? defaultValue;
}

/**
 * Check if a variable contains sensitive data that shouldn't be public
 */
const SERVER_ONLY_PATTERNS = [
  'SECRET',
  'PASSWORD',
  'API_KEY',
  'PRIVATE_KEY',
  'WEBHOOK_SECRET',
  'SERVICE_KEY',
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
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PROJECT_ID',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check for secrets in NEXT_PUBLIC_ variables
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_') && value) {
      for (const pattern of SERVER_ONLY_PATTERNS) {
        if (key.includes(pattern)) {
          warnings.push(
            `SECURITY WARNING: ${key} appears to contain sensitive data and is exposed client-side. Move this to a private environment variable.`
          );
        }
      }
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL should start with https://');
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
    const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    return url;
  },

  get supabaseAnonKey(): string {
    const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    return key;
  },

  get supabaseProjectId(): string {
    const id = getEnvVar('NEXT_PUBLIC_SUPABASE_PROJECT_ID');
    if (!id) {
      // Try to extract from URL
      const url = this.supabaseUrl;
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match) return match[1];
      throw new Error('NEXT_PUBLIC_SUPABASE_PROJECT_ID is required');
    }
    return id;
  },

  get cashfreeTestMode(): boolean {
    return getEnvVar('NEXT_PUBLIC_CASHFREE_TEST_MODE') === 'true';
  },

  get enableAnalytics(): boolean {
    return getEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS') === 'true';
  },

  get enableDevTools(): boolean {
    return getEnvVar('NEXT_PUBLIC_ENABLE_DEVTOOLS') === 'true';
  },

  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  get appUrl(): string {
    return getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') || 'http://localhost:3000';
  },
};

/**
 * Log environment validation results
 * Only logs in development mode
 */
export function logEnvStatus(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const result = validateEnv();

  if (result.missing.length > 0) {
    console.error('❌ Missing required environment variables:', result.missing);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment configuration warnings:');
    result.warnings.forEach(w => console.warn('  ', w));
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment configuration valid');
  }
}

// Export types
export type { EnvConfig, ValidationResult };
