# Phase 1: Architecture Scaffold — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### TypeScript & Code Quality
| Metric | Target | Tool |
|--------|--------|------|
| TypeScript strict mode errors | 0 errors | `tsc --noEmit` |
| ESLint errors | 0 errors | `next lint` |
| ESLint warnings | ≤ 5 warnings | `next lint` |
| Dead code / unused exports | 0 | `ts-prune` / ESLint |
| Circular dependencies | 0 | `madge --circular` |

### Bundle & Build
| Metric | Target | Tool |
|--------|--------|------|
| Cold build time | < 60s | `next build` timing |
| First Load JS (shared chunk) | < 100 KB | `next build` output |
| Per-page JS budget | < 200 KB | `next build` output |
| `next/image` usage | 100% (0 raw `<img>` tags) | grep / ESLint |

### Middleware & Auth
| Metric | Target | Verification |
|--------|--------|--------------|
| Middleware matcher coverage | All protected routes matched | Unit test `middleware.ts` |
| JWT verification latency | < 5ms per call | Benchmark with `jose` |
| Auth guard on all admin routes | 100% | Route audit grep |

### Logging
| Metric | Target | Tool |
|--------|--------|------|
| Structured JSON logs | All logs via `pino` | Code audit |
| Log levels (error/warn/info/debug) | All 4 in use | Code audit |
| No `console.log` in production code | 0 occurrences | ESLint `no-console` rule |

---

## Phase 1 Audit Checklist (Run Before Moving to Phase 2)

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx next lint` → 0 errors
- [ ] `npx next build` → builds successfully, shared JS < 100 KB
- [ ] `grep -r "<img " src/` → 0 results
- [ ] `grep -r "console.log" src/` → 0 results (or only debug-guarded)
- [ ] All admin API routes return 401 without valid JWT
- [ ] `middleware.ts` matcher tested for `/dashboard/*`, `/api/admin/*`

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 1: ARCHITECTURE SCAFFOLD
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

You are executing Phase 1 of a Next.js e-commerce platform build. Work through tasks P1.1–P1.12 sequentially. After each task, verify it passes its audit criteria before proceeding. Never stop to ask for permission — make all decisions autonomously using industry best practices.

RULES:
1. Complete each task fully before moving to the next.
2. Run `npx tsc --noEmit` after every TypeScript file creation — fix all errors before proceeding.
3. Run `npx next lint` after all P1.x files are created — fix all errors.
4. Replace every raw `<img>` tag with `next/image` — zero exceptions.
5. All logs must use the pino logger from lib/logger/index.ts — no console.log in production paths.
6. JWT verification must use the `jose` library only.
7. All CSS custom properties go in styles/theme.css and are aliased in tailwind.config.ts.
8. Never hardcode secrets — use process.env with type-safe accessors.
9. If a file already exists, read it first, then patch — never overwrite blindly.
10. After completing all P1.x tasks, run the full audit checklist above and confirm 0 errors.

START: Execute P1.1 now. Continue through P1.12 without stopping.
```
