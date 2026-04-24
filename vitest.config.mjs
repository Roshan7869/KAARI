import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    // Use jsdom for component testing
    environment: 'jsdom',

    // Global test setup file
    setupFiles: ['./tests/setup.ts', './mocks/setup.ts'],

    // Include test patterns
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}'],

    // Exclude E2E tests (handled by Playwright)
    exclude: ['tests/e2e/**', 'node_modules/**'],

    // Coverage configuration
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'contexts/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
      exclude: [
        'app/**/*.d.ts',
        'components/**/*.d.ts',
        'contexts/**/*.d.ts',
        'hooks/**/*.d.ts',
        'lib/**/*.d.ts',
        'types/**',
        '**/*.config.*',
        '**/layout.tsx',
        '**/loading.tsx',
        '**/error.tsx',
        '**/not-found.tsx',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Global test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // Watch mode settings
    watch: false,
  },

  // Define environment variables for tests
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'),
    'process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'test-project-id'),
  },
});
