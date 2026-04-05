# Phase 2: Database Implementation — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Schema & Migrations
| Metric | Target | Tool |
|--------|--------|------|
| Migration idempotency | All migrations re-runnable safely | `IF NOT EXISTS` guards |
| Foreign key constraints | 100% referential integrity | `psql \d tablename` |
| Indexes on foreign keys | 100% FK columns indexed | `pg_indexes` query |
| Indexes on query-hot columns | All filter/sort columns indexed | EXPLAIN ANALYZE |
| Nullable vs NOT NULL accuracy | No unintentional NULLs | Schema review |

### Connection Pool
| Metric | Target | Standard |
|--------|--------|----------|
| Max pool size | 10–20 connections | pg `max_connections` / pgBouncer |
| Connection timeout | < 5s | Pool config |
| Idle connection timeout | 30s | Pool config |
| Pool overflow behavior | Queue, not crash | Error handling |

### Query Performance
| Metric | Target | Tool |
|--------|--------|------|
| Simple SELECT latency (indexed) | < 5ms (p99) | `EXPLAIN ANALYZE` |
| JOIN query latency (3 tables) | < 20ms (p99) | `EXPLAIN ANALYZE` |
| Write (INSERT/UPDATE) latency | < 10ms (p99) | `EXPLAIN ANALYZE` |
| Seq scan on large tables | 0 (must use index) | `EXPLAIN ANALYZE` |
| N+1 query patterns | 0 | Code audit + query logging |

### Type Safety
| Metric | Target | Tool |
|--------|--------|------|
| Typed query wrapper coverage | 100% DB calls via `lib/db/query.ts` | Code audit |
| Raw SQL injection vectors | 0 (all parameterized) | Code audit |

### Seed Data
| Metric | Target |
|--------|--------|
| Seed runs without errors | ✅ |
| At least 5 categories seeded | ✅ |
| At least 20 products seeded | ✅ |
| At least 3 test users seeded | ✅ |
| At least 5 test orders seeded | ✅ |

---

## Phase 2 Audit Checklist

- [ ] `psql -c "\dt"` → all expected tables exist
- [ ] `SELECT * FROM pg_indexes WHERE tablename = 'products'` → indexes present
- [ ] `EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = 1` → no Seq Scan
- [ ] `node -e "require('./lib/db/client')"` → connects without error
- [ ] Re-run migrations → idempotent (no errors on second run)
- [ ] Seed script runs to completion with 0 errors

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 2: DATABASE IMPLEMENTATION
PERMISSIONS: ALL FILE OPERATIONS AND DATABASE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED.

Execute tasks P2.1–P2.6 for the database layer of a Next.js e-commerce platform. Use PostgreSQL with parameterized queries only. All tasks must pass audit criteria before Phase 2 is marked complete.

RULES:
1. All SQL migrations must use `IF NOT EXISTS` guards for idempotency.
2. Every foreign key column must have a corresponding index — create it if missing.
3. All queries routed through `lib/db/query.ts` typed wrapper — no raw pg calls outside this module.
4. Connection pool: min 2, max 10, idle timeout 30s, connection timeout 5s.
5. Zero parameterized query bypasses — every user-supplied value must be a `$1` parameter.
6. Seed data must be deterministic and re-runnable using `ON CONFLICT DO NOTHING`.
7. After P2.3, run EXPLAIN ANALYZE on 3 key queries and confirm index usage.
8. Never drop existing tables in migrations — only ADD or ALTER safely.
9. Log all slow queries (> 100ms) via pino logger.
10. After P2.6, run the full audit checklist above — confirm all pass.

START: Execute P2.1 now. Continue through P2.6 without stopping.
```
