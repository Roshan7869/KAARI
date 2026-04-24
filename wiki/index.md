# Wiki Index

The catalog of all pages in this wiki. Each entry: a wikilink to the page and a one-line summary. The LLM reads this first when answering queries to identify candidate pages.

Keep summaries tight — one line each. The index is engineered to be cheap to read; a fat index defeats its purpose.

When this file exceeds ~300 lines or the wiki passes ~150 pages, shard into `wiki/indexes/<type>.md` and replace this file with a directory of shards. See the `scaling-playbook.md` reference in the `llm-wiki` skill for the migration procedure.

---

## Synthesis

- [[project-audit-2026-04]] — Full project audit: 15 findings across P0–P3 severity
- [[fix-plan-master]] — Master fix plan with 8 tracks, dependency graph, and verification checklist

## Entities

- [[supabase-server-ts]] — Highest blast-radius file, 13 direct + 28 indirect consumers, RLS bypass issue
- [[middleware-ts]] — Edge middleware: CSP, auth, CSRF cookie, route protection (195 lines, 10 responsibilities)
- [[cart-context]] — CartContext: 489 lines of useState + raw fetch, no TanStack Query
- [[api-routes]] — 59 API route files, consistency matrix showing auth/validation/CSRF/rate-limit gaps

## Concepts

- [[security-posture]] — Defense layer analysis: middleware, API routes, DB, sanitization, infrastructure
- [[state-management-patterns]] — 3 patterns (Query, direct supabase, raw fetch) with no clear convention
- [[duplication-hotspots]] — 7+ duplicate module pairs and 3 duplicate component pairs
- [[fix-track-p0-secrets]] — P0 fix: rotate & remove exposed secrets from git history
- [[fix-track-p0-rls]] — P0 fix: enforce RLS by switching 46 routes from admin to user-scoped client
- [[fix-track-p1-auth]] — P1 fix: standardize admin auth to single `requireAdmin()` pattern
- [[fix-track-p1-csrf]] — P1 fix: add CSRF validation to 50+ unprotected mutation routes
- [[fix-track-p1-bundle]] — P1 fix: split logger into client/server to remove Sentry from client bundles
- [[fix-track-p1-ratelimit]] — P1 fix: expand rate limiting from 7 to all 60+ routes with tiered limits
- [[fix-track-p2-components]] — P2 fix: decompose 3 god components (1285/920/833 lines) into smaller units
- [[fix-track-p2-cart]] — P2 fix: refactor CartContext to TanStack Query with optimistic updates
- [[fix-track-p2-duplication]] — P2 fix: consolidate 7 duplicate module pairs, delete unused variants
- [[fix-track-p2-tests]] — P2 fix: add core test coverage (payment, auth, cart, validation, RLS) + fix env exposure
- [[fix-track-p3-cleanup]] — P3 fix: remove redundant AuthProvider, increase stale time, extract cashfree-mcp, clean worktrees

## Sources

- Project codebase audit (2026-04-23)