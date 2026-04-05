# Phase 4: Test Coverage — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Coverage Targets (Industry Standard for Production Apps)
| Coverage Type | Minimum Target | Ideal Target |
|---------------|---------------|--------------|
| Line coverage | ≥ 80% | ≥ 90% |
| Branch coverage | ≥ 75% | ≥ 85% |
| Function coverage | ≥ 80% | ≥ 90% |
| Statement coverage | ≥ 80% | ≥ 90% |

### Unit & Integration Tests
| Test Suite | Target Pass Rate | Max Execution Time |
|------------|-----------------|-------------------|
| Cart store tests (P4.1) | 100% | < 5s |
| Checkout flow tests (P4.2) | 100% | < 10s |
| Payment webhook tests (P4.3) | 100% | < 5s |
| Auth flow tests (P4.4) | 100% | < 5s |
| Product CRUD tests (P4.5) | 100% | < 10s |
| Security unit tests (P4.6) | 100% | < 5s |
| All API route tests (P4.7) | 100% | < 30s total |

### End-to-End Tests (Playwright/Cypress)
| E2E Scenario | Pass Rate | Max Duration |
|--------------|-----------|--------------|
| E2E purchase journey (P4.8) | 100% | < 60s |
| E2E admin journey (P4.9) | 100% | < 45s |
| E2E auth journey (P4.10) | 100% | < 30s |

### Test Quality Metrics
| Metric | Target |
|--------|--------|
| Flaky tests | 0 (zero retries needed) |
| Tests with hardcoded timeouts | 0 |
| Mock coverage of external services | 100% (no real API calls in unit tests) |
| Test isolation (no shared state) | 100% |
| Critical path coverage (checkout) | 100% |

---

## Phase 4 Audit Checklist

- [ ] `npx jest --coverage` → all coverage targets met
- [ ] `npx jest` → 0 failing tests, 0 flaky tests
- [ ] `npx playwright test` → all E2E tests pass
- [ ] No test calls real external APIs (all mocked)
- [ ] CI runs tests in < 5 minutes total
- [ ] Payment webhook test covers: valid HMAC ✅, invalid HMAC ✅, duplicate event ✅

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 4: TEST COVERAGE
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Write a comprehensive test suite for all features built in Phase 3. All tests must be deterministic, isolated, and production-grade.

RULES:
1. Use Jest + React Testing Library for unit/integration tests.
2. Use Playwright for E2E tests.
3. All external services (DB, Redis, email, payment) must be mocked in unit tests — no real calls.
4. Every test must be fully isolated — use beforeEach to reset state, afterEach for cleanup.
5. No hardcoded `setTimeout` in tests — use `waitFor` or proper async patterns.
6. Test both happy path AND error/edge cases for every module.
7. Payment webhook tests MUST cover: valid HMAC, tampered HMAC, duplicate idempotency key, missing fields.
8. Auth tests MUST cover: valid login, wrong password, expired token, missing token, rate limit trigger.
9. E2E tests must test the full user journey without any manual steps.
10. After all P4.x tasks, run `npx jest --coverage` and confirm all coverage targets met.

START: Execute P4.1 now. Continue through P4.10 without stopping.
```
