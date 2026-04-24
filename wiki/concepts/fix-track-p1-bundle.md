---
type: concept
title: "Fix Track P1 — Split Logger (Sentry in Client Bundles)"
tags: [fix-plan, high, performance, bundle-size]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P1 — Split Logger (Sentry in Client Bundles)

## Problem

`lib/logger.ts` top-level imports `@sentry/nextjs`. 5 client components, 3 hooks, and 2 contexts import the logger, pulling the full Sentry SDK (~40KB gzipped) into client bundles even though they only call `logger.debug()` which is a no-op in production.

## Client Components Pulling Sentry

| File | Import | Logger Usage |
|------|--------|-------------|
| `components/pages/Signup.tsx` | `import { logger } from '@/lib/logger'` | `logger.debug()` |
| `components/pages/Login.tsx` | `import { logger } from '@/lib/logger'` | `logger.debug()` |
| `components/pages/DummyPayment.tsx` | `import { logger } from '@/lib/logger'` | `logger.debug()` |
| `components/products/WishlistButton.tsx` | `import { logger } from '@/lib/logger'` | `logger.debug()` |
| `components/admin/NotificationCenter.tsx` | `import { logger } from '@/lib/logger'` | `logger.debug()` |
| `hooks/useAdminProducts.ts` | `import { logger } from '@/lib/logger'` | `logger.info/debug/error` |
| `hooks/useAdminDashboard.ts` | `import { logger } from '@/lib/logger'` | `logger.info/error` |
| `hooks/useSearchSuggestions.ts` | `import { logger } from '@/lib/logger'` | `logger.error` |
| `contexts/AuthContext.tsx` | `import { logger } from '@/lib/logger'` | `logger.error` |
| `contexts/CartContext.tsx` | `import { logger } from '@/lib/logger'` | `logger.error` |

## Solution: Split into Client + Server Loggers

### `lib/logger-client.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  debug: (...args: unknown[]) => isDev && console.debug('[debug]', ...args),
  info: (...args: unknown[]) => console.info('[info]', ...args),
  warn: (...args: unknown[]) => console.warn('[warn]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
};

export { logger };
```

### `lib/logger-server.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = {
  debug: (...args: unknown[]) => { /* no-op in prod */ },
  info: (...args: unknown[]) => console.info('[info]', ...args),
  warn: (...args: unknown[]) => {
    console.warn('[warn]', ...args);
    Sentry.captureMessage(args.join(' '), { level: 'warning' });
  },
  error: (...args: unknown[]) => {
    console.error('[error]', ...args);
    Sentry.captureException(args[0] instanceof Error ? args[0] : new Error(String(args[0])));
  },
};

export { logger };
```

### `lib/logger.ts` (Backward Compat Re-export)

```typescript
// Deprecated: import from logger-client or logger-server directly
if (typeof window !== 'undefined') {
  module.exports = require('./logger-client');
} else {
  module.exports = require('./logger-server');
}
```

## Steps

1. Create `lib/logger-client.ts` (no Sentry import)
2. Create `lib/logger-server.ts` (Sentry import kept)
3. Update 5 client components → `import { logger } from '@/lib/logger-client'`
4. Update 3 hooks → `import { logger } from '@/lib/logger-client'` (hooks run client-side)
5. Update 2 contexts → `import { logger } from '@/lib/logger-client'`
6. Keep 44 API route files on `lib/logger-server.ts`
7. Add `lib/logger.ts` as backward-compat re-export (or update all consumers)
8. Verify client bundle size reduction via `npm run analyze`

## Expected Impact

- Client bundle reduction: ~40KB gzipped (Sentry SDK removed from client)
- No behavior change — `logger.debug()` was already a no-op in prod
- Server-side logging unchanged

## Links

- [[fix-plan-master]] — master plan
- [[security-posture]] — monitoring/observability context