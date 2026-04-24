---
type: entity
title: "API Routes — Consistency Issues"
tags: [architecture, api, consistency]
sources:
  - wiki/synthesis/project-audit-2026-04
created: 2026-04-23
updated: 2026-04-23
---

# API Routes — Consistency Issues

59 API route files with 89+ HTTP method handlers. Multiple inconsistencies across auth, validation, rate limiting, and error handling.

## Route Stats

| Category | Count | Notes |
|----------|-------|-------|
| Admin routes | ~20 | Require admin role |
| User mutation routes | ~16 | POST/PUT/PATCH/DELETE |
| User read routes | ~8 | GET |
| Webhook routes | 2 | Signature-based auth |
| Cron routes | 3 | System-only |
| Auth routes | 5 | Login/signup/me/password-reset |

## Consistency Matrix

| Feature | Routes With | Routes Without | Coverage |
|---------|-------------|-----------------|----------|
| Auth check | ~45 | ~14 | 76% |
| Zod validation | 31 | 28+ | 52% |
| Rate limiting | 7 | 52+ | 12% |
| CSRF validation | 1 | 50+ | 2% |
| Error handler | ~40 | ~19 | 68% |
| Audit logging | ~10 | ~49 | 17% |
| `createAdminClient` | 46 | 13 | 78% (should be lower) |

## Recommended: `createApiRoute()` Factory

Most routes share the same pattern:

```typescript
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();     // auth
  const rateLimitError = await applyRateLimit(); // rate limit
  const csrfError = await validateCsrf();       // csrf
  const body = await validateBody(schema);       // validation
  const supabase = await createClient();        // db
  // ... business logic
  return Response.json(data);
}
```

A factory function could reduce boilerplate and enforce consistency:

```typescript
export const POST = createApiRoute({
  auth: 'admin',
  rateLimit: 'mutation',
  csrf: true,
  validate: productSchema,
  handler: async (body, { userId, supabase }) => {
    // business logic only
  },
});
```

## Links

- [[fix-plan-master]] — tracks that fix these issues
- [[fix-track-p1-auth]] — auth standardization
- [[fix-track-p1-csrf]] — CSRF expansion
- [[fix-track-p1-ratelimit]] — rate limit expansion
- [[supabase-server-ts]] — admin client overuse