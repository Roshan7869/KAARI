# Platform Build — Master Metrics Index

## Purpose
This document is the single source of truth for all 10 phase performance metrics and autopilot prompts. Each phase must pass its audit checklist before the next phase begins. All files are in `docs/phase_metrics/`.

## File Map
| File | Phase | Key Metric |
|------|-------|-----------|
| `phase1_architecture_scaffold.md` | Architecture | 0 TS errors, 0 ESLint errors, JS < 100KB |
| `phase2_database_implementation.md` | Database | Query p99 < 20ms, 100% FK indexed |
| `phase3_feature_implementation.md` | Features | 100% Zod validated, HMAC on webhooks |
| `phase4_test_coverage.md` | Tests | ≥ 80% coverage, 100% pass rate |
| `phase5_email_system.md` | Email | Non-blocking dispatch, < 30s delivery |
| `phase6_performance.md` | Performance | LCP < 2.0s, INP < 150ms, Lighthouse ≥ 85 |
| `phase7_seo_legal.md` | SEO & Legal | Rich Results pass, 5 policy pages live |
| `phase8_security_hardening.md` | Security | A+ headers, 0 injection vectors |
| `phase9_accessibility_ux.md` | Accessibility | 0 axe violations, WCAG AA, score ≥ 95 |
| `phase10_deployment.md` | Deployment | All CI green, /api/health 200, Docker < 300MB |

## Execution Order
Run phases strictly in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
After each phase, run that phase's audit checklist before starting the next.

## Global Autopilot Rules (Apply to ALL Phases)
1. ALL file operations are pre-approved — create, edit, delete without asking.
2. Never stop mid-phase waiting for human input — make all architectural decisions using industry best practices.
3. If a dependency is missing, install it via `npm install <package>` and continue.
4. If a file already exists, read it first, then patch incrementally — never overwrite blindly.
5. Log all actions via the pino logger — never use console.log in production code.
6. After completing ALL 10 phases, run a final Lighthouse audit and confirm all 15 Master Scorecard metrics are GREEN.
