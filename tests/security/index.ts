/**
 * Security Tests Index
 *
 * This file exports all security test modules for easy importing
 * and provides documentation for the security test suite.
 *
 * @module tests/security
 */

/**
 * Security Test Suite Structure
 *
 * tests/
 * ├── unit/
 * │   ├── lib/
 * │   │   ├── sanitization.spec.ts      - XSS and SQL injection prevention
 * │   │   ├── csrf.spec.ts               - CSRF token generation and validation
 * │   │   ├── rateLimit.spec.ts          - Rate limiting for brute force prevention
 * │   │   ├── webhook.spec.ts            - Webhook signature validation
 * │   │   ├── input-validation.spec.ts   - Comprehensive input validation tests
 * │   │   └── payment-secure.spec.ts     - Payment session security
 * │   └── auth/
 * │       └── auth-security.spec.ts      - Authentication security tests
 * ├── integration/
 * │   └── admin-protection.spec.ts       - Admin route access control
 * └── security/
 *     └── payment-security.spec.ts       - Payment flow security tests
 *
 * Security Areas Covered:
 * ------------------------
 * 1. XSS Prevention (Cross-Site Scripting)
 *    - HTML injection blocking
 *    - JavaScript URL blocking
 *    - Event handler sanitization
 *    - Unicode/encoding attacks
 *
 * 2. SQL Injection Prevention
 *    - Query parameterization
 *    - Wildcard escaping
 *    - NoSQL injection awareness
 *
 * 3. CSRF Protection
 *    - Token generation
 *    - Token validation
 *    - Timing-safe comparison
 *    - Expiration handling
 *
 * 4. Authentication Security
 *    - Password handling
 *    - Session management
 *    - Role-based access control
 *    - Brute force prevention
 *
 * 5. Authorization
 *    - Admin route protection
 *    - Resource ownership
 *    - Permission checks
 *
 * 6. Rate Limiting
 *    - Login attempt limiting
 *    - API endpoint protection
 *    - Payment throttling
 *
 * 7. Payment Security
 *    - Amount tampering prevention
 *    - Session validation
 *    - Webhook signature validation
 *    - Replay attack prevention
 *
 * 8. Input Validation
 *    - Email validation
 *    - Phone validation
 *    - URL sanitization
 *    - Length limits
 *
 * Running Security Tests:
 * -----------------------
 * Run all security tests:
 *   npx vitest run tests/unit/lib/sanitization.spec.ts
 *   npx vitest run tests/unit/lib/csrf.spec.ts
 *   npx vitest run tests/unit/lib/rateLimit.spec.ts
 *   npx vitest run tests/unit/lib/webhook.spec.ts
 *   npx vitest run tests/unit/lib/input-validation.spec.ts
 *   npx vitest run tests/unit/auth/auth-security.spec.ts
 *   npx vitest run tests/integration/admin-protection.spec.ts
 *   npx vitest run tests/security/payment-security.spec.ts
 *
 * Run all tests:
 *   npm run test
 */

// Security test files are run directly by Vitest
// This file is for documentation purposes

export const securityTestDocs = {
  xssPrevention: {
    file: 'tests/unit/lib/sanitization.spec.ts',
    description: 'Tests for XSS prevention through input sanitization',
    coverage: [
      'Script tag removal',
      'Event handler blocking',
      'SVG/iframe injection',
      'Unicode encoding attacks',
      'Mutation XSS',
    ],
  },
  csrfProtection: {
    file: 'tests/unit/lib/csrf.spec.ts',
    description: 'Tests for CSRF token security',
    coverage: [
      'Token generation',
      'Token validation',
      'Timing-safe comparison',
      'Session storage handling',
    ],
  },
  rateLimiting: {
    file: 'tests/unit/lib/rateLimit.spec.ts',
    description: 'Tests for rate limiting functionality',
    coverage: [
      'Login rate limits',
      'Payment rate limits',
      'API rate limits',
      'Fallback mode',
    ],
  },
  webhookSecurity: {
    file: 'tests/unit/lib/webhook.spec.ts',
    description: 'Tests for webhook signature validation',
    coverage: [
      'HMAC-SHA256 validation',
      'Timing attack prevention',
      'Payload validation',
      'Idempotency',
    ],
  },
  inputValidation: {
    file: 'tests/unit/lib/input-validation.spec.ts',
    description: 'Comprehensive input validation tests',
    coverage: [
      'Email format validation',
      'Phone number validation',
      'URL sanitization',
      'Length limits',
      'Encoding attacks',
    ],
  },
  authSecurity: {
    file: 'tests/unit/auth/auth-security.spec.ts',
    description: 'Authentication security tests',
    coverage: [
      'Password security',
      'Session management',
      'Role-based access control',
      'Brute force prevention',
    ],
  },
  adminProtection: {
    file: 'tests/integration/admin-protection.spec.ts',
    description: 'Admin route access control tests',
    coverage: [
      'Admin role verification',
      'Unauthenticated redirect',
      'Non-admin redirect',
      'Session validation',
    ],
  },
  paymentSecurity: {
    file: 'tests/security/payment-security.spec.ts',
    description: 'Payment flow security tests',
    coverage: [
      'Session ownership',
      'Amount tampering prevention',
      'Webhook security',
      'Replay attack prevention',
    ],
  },
};