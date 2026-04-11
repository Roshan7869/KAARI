# Rate Limiting API Documentation

## Overview

The rate limiting system provides distributed, server-side rate limiting for critical endpoints using Supabase Edge Functions. This prevents brute force attacks, API abuse, and ensures fair resource allocation.

## Architecture

```
Client Request
     │
     ▼
┌─────────────────┐
│  lib/rateLimit  │ ──── Primary: Edge Function (server-side)
│    (Client)     │ ──── Fallback: In-memory (development/offline)
└─────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│              Edge Function: rate-limit                  │
│                                                         │
│  1. Parse request (action, identifier, IP)              │
│  2. Check database for existing rate limit entry        │
│  3. If blocked → return 429                             │
│  4. If window expired → reset counter                    │
│  5. If limit exceeded → block and return 429            │
│  6. Else → increment counter and return 200             │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│      rate_limit_entries table      │
│                                     │
│  - identifier (IP or user ID)       │
│  - action_type (login, signup, etc) │
│  - attempt_count                    │
│  - first_attempt (window start)     │
│  - blocked_until (if blocked)       │
└─────────────────────────────────────┘
```

## Endpoint

### POST `/functions/v1/rate-limit`

Checks and optionally increments the rate limit counter for a specific action and identifier.

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `Authorization` | No | Bearer token for authenticated requests |
| `X-Client-IP` | No | Client IP address (server can override) |

#### Request Body

```typescript
interface RateLimitRequest {
  action: 'login' | 'signup' | 'passwordReset' | 'checkout' | 'payment' | 'api';
  identifier?: string;  // Optional: user ID for authenticated requests
  ip?: string;          // Optional: IP address for unauthenticated requests
  increment?: boolean;  // Default: true - whether to increment the counter
}
```

#### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum attempts allowed per window |
| `X-RateLimit-Remaining` | Remaining attempts in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds until rate limit resets (only when blocked) |

#### Success Response (200 OK)

```json
{
  "allowed": true,
  "remaining": 4,
  "resetAt": "2026-03-28T10:30:00.000Z",
  "limit": 5,
  "window": 900
}
```

#### Rate Limited Response (429 Too Many Requests)

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 1800,
  "resetAt": "2026-03-28T11:00:00.000Z"
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid action type or missing required fields |
| 429 | Rate limit exceeded |
| 500 | Server configuration error |

## Rate Limit Configurations

| Action | Max Attempts | Window | Block Duration | Description |
|--------|-------------|--------|----------------|-------------|
| `login` | 5 | 15 min | 30 min | Authentication attempts |
| `signup` | 3 | 1 hour | 1 hour | Account creation |
| `passwordReset` | 3 | 1 hour | 1 hour | Password reset requests |
| `checkout` | 10 | 15 min | 30 min | Order creation attempts |
| `payment` | 5 | 1 hour | 1 hour | Payment processing |
| `api` | 100 | 1 min | 5 min | General API requests |

## Client Library Usage

### Import

```typescript
import {
  checkRateLimit,
  recordAttempt,
  clearRateLimit,
  getRemainingAttempts,
  checkLoginRateLimit,
  checkCheckoutRateLimit,
  checkPaymentRateLimit,
  checkApiRateLimit,
  useRateLimit
} from '@/lib/rateLimit';
```

### Basic Usage

```typescript
// Check if action is allowed (and increment counter)
const result = await checkRateLimit('login', 'user@example.com');

if (!result.allowed) {
  console.log(`Blocked! Try again in ${result.retryAfter} seconds`);
  console.log(`Resets at: ${result.resetAt}`);
}

// Just check without incrementing
const check = await checkRateLimit('login', 'user@example.com', { increment: false });

// Record a failed attempt
await recordAttempt('login', 'user@example.com', false);

// Record a successful attempt (clears rate limit)
await recordAttempt('login', 'user@example.com', true);

// Get remaining attempts
const remaining = await getRemainingAttempts('login', 'user@example.com');

// Clear rate limit manually (rarely needed)
await clearRateLimit('login', 'user@example.com');
```

### React Hook Usage

```typescript
import { useRateLimit } from '@/lib/rateLimit';

function LoginForm() {
  const { check, record, remaining } = useRateLimit('login', 'user@example.com');

  const handleSubmit = async (e: React.FormEvent) => {
    const result = await check();
    if (!result.allowed) {
      setError(`Too many attempts. Try again later.`);
      return;
    }
    // ... proceed with login
  };
}
```

### Convenience Functions

```typescript
// Login rate limiting (by email)
const loginResult = await checkLoginRateLimit('user@example.com');

// Checkout rate limiting (by user ID)
const checkoutResult = await checkCheckoutRateLimit(userId);

// Payment rate limiting (by user ID)
const paymentResult = await checkPaymentRateLimit(userId);

// API rate limiting (by IP or identifier)
const apiResult = await checkApiRateLimit('api-client-123');
```

## Fallback Behavior

When the Edge Function is unavailable (development mode, network issues), the client library automatically falls back to in-memory rate limiting:

- **Advantages**: Application remains functional
- **Limitations**: Not distributed across clients, resets on page reload

```typescript
// Check if using fallback mode
import { isFallbackMode, enableFallbackMode, resetFallbackMode } from '@/lib/rateLimit';

if (isFallbackMode()) {
  console.warn('Using client-side rate limiting (not recommended for production)');
}

// For testing: force fallback mode
enableFallbackMode();

// For testing: reset to server mode
resetFallbackMode();
```

## Security Considerations

### Identification Strategy

| Scenario | Identifier | Notes |
|----------|------------|-------|
| Unauthenticated requests | IP address | Extracted from headers (X-Forwarded-For, X-Real-IP) |
| Authenticated requests | User ID | From JWT token in Authorization header |
| Mixed | User ID preferred | Authenticated users tracked by ID, not IP |

### Attack Mitigation

1. **Brute Force**: Limited attempts per window prevent password spraying
2. **Distributed Attacks**: Server-side tracking works across all clients
3. **IP Spoofing**: Authenticated users identified by account, not IP
4. **Rate Limit Bypass**: Database-backed counters persist across requests

### CORS Configuration

The Edge Function validates request origin:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  // Supabase project URLs (*.supabase.co)
  // Vercel deployments (*.vercel.app)
];
```

## Database Schema

```sql
CREATE TABLE rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, action_type)
);

-- Indexes for performance
CREATE INDEX idx_rate_limit_identifier ON rate_limit_entries(identifier);
CREATE INDEX idx_rate_limit_action_type ON rate_limit_entries(action_type);
CREATE INDEX idx_rate_limit_blocked ON rate_limit_entries(blocked_until)
  WHERE blocked_until IS NOT NULL;
```

## Cleanup

Rate limit entries should be periodically cleaned up:

```sql
-- Clean up expired entries (run via pg_cron)
SELECT public.cleanup_expired_rate_limits();

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE blocked_until IS NOT NULL AND blocked_until < NOW()
     OR first_attempt < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

## Monitoring

Security events are logged to the `security_events` table:

```sql
SELECT event_type, details, created_at
FROM security_events
WHERE event_type = 'RATE_LIMIT_BLOCKED'
ORDER BY created_at DESC
LIMIT 10;
```

## Testing

```typescript
import { test, expect } from '@playwright/test';
import { checkRateLimit, clearRateLimit, recordAttempt, enableFallbackMode } from '../../lib/rateLimit';

test.beforeEach(() => {
  enableFallbackMode(); // Use in-memory rate limiting for tests
});

test('blocks after max attempts', async () => {
  const identifier = 'test@example.com';
  await clearRateLimit('login', identifier);

  for (let i = 0; i < 5; i++) {
    await recordAttempt('login', identifier, false);
  }

  const result = await checkRateLimit('login', identifier);
  expect(result.allowed).toBeFalsy();
  expect(result.blocked).toBeTruthy();
});
```