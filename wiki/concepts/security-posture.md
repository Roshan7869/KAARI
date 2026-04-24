---
type: concept
title: "Security Posture — Defense Layers"
tags: [security, csrf, rls, rate-limit, secrets]
sources:
  - wiki/synthesis/project-audit-2026-04
created: 2026-04-23
updated: 2026-04-23
---

# Security Posture — Defense Layers

The project has multiple security layers but significant gaps in each.

## Layer 1: Middleware ([[middleware-ts]])

| Control | Status | Gap |
|---------|--------|-----|
| Route protection | Good | — |
| Admin role check | Good | Redundant with route-level checks |
| CSP headers | Partial | `unsafe-eval`, `unsafe-inline` weaken it |
| CSRF cookie | Set | Not validated by most routes |
| Nonce generation | Good | — |

## Layer 2: API Route Level

| Control | Status | Gap |
|---------|--------|-----|
| Auth verification | 76% | 14 routes skip auth |
| Input validation | 52% | 28+ routes accept unvalidated input |
| CSRF validation | 2% | Only checkout validates CSRF |
| Rate limiting | 12% | 52+ routes unthrottled |
| RLS enforcement | 22% | 46 routes use admin client |
| Error handling | 68% | Some routes don't catch errors |
| Audit logging | 17% | Most mutations not logged |

## Layer 3: Database (Supabase)

| Control | Status | Gap |
|---------|--------|-----|
| RLS policies | Exist | Bypassed by admin client |
| Service role key | In env | Exposed in git history |
| User-scoped queries | Partial | Many routes use admin client |

## Layer 4: Input Sanitization

| Control | Status | Gap |
|---------|--------|-----|
| `sanitizeTextInput()` | Used in some routes | Not enforced everywhere |
| `sanitizeSearchQuery()` | Used in search | Good |
| `sanitizeUrl()` | Available | Usage unknown |
| Zod schemas | 7 schemas defined | Not used in all routes |

## Layer 5: Infrastructure

| Control | Status | Gap |
|---------|--------|-----|
| Vercel deployment | Active | — |
| Secret rotation | Guide exists | Not automated |
| Monitoring (Sentry) | Active | Pulled into client bundles |
| Rate limiting (Upstash) | Active | Limited coverage |

## Priority Fixes

1. [[fix-track-p0-secrets]] — rotate exposed credentials
2. [[fix-track-p0-rls]] — enforce RLS on user routes
3. [[fix-track-p1-csrf]] — validate CSRF on mutations
4. [[fix-track-p1-ratelimit]] — throttle all endpoints
5. [[fix-track-p1-auth]] — consistent admin auth

## Links

- [[fix-plan-master]] — master plan
- [[middleware-ts]] — edge security
- [[supabase-server-ts]] — database security
- [[api-routes]] — route-level gaps