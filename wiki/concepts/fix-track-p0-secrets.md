---
type: concept
title: "Fix Track P0 — Rotate & Remove Exposed Secrets"
tags: [fix-plan, critical, security, secrets]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P0 — Rotate & Remove Exposed Secrets

## Problem

`.env.local` containing real production credentials is committed to the git repository. Exposed secrets include:

| Secret | Service | Risk if Leaked |
|--------|---------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Full DB read/write, bypasses RLS |
| `SUPABASE_SERVICE_KEY` | Supabase | API access |
| `CLERK_SECRET_KEY` | Clerk | User management, token minting |
| `CASHFREE_SECRET_KEY` | Cashfree | Payment creation/refunds |
| `CASHFREE_APP_ID` | Cashfree | Payment session creation |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Rate limit bypass/ manipulation |
| `RESEND_API_KEY` | Resend | Send emails as your domain |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Low risk (public DSN by design) |

## Steps

### Step 1: Immediate — Add to `.gitignore`

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
echo ".env*.local" >> .gitignore
```

### Step 2: Remove from Git Tracking

```bash
rtk git rm --cached .env.local
rtk git rm --cached .env  # if tracked
```

### Step 3: Purge from Git History

Use BFG Repo Cleaner (faster) or `git filter-repo`:

```bash
# Option A: BFG
bfg --delete-files .env.local
rtk git reflog expire --expire=now --all
rtk git gc --prune=now --aggressive

# Option B: git filter-repo
git filter-repo --path .env.local --invert-paths
```

### Step 4: Rotate ALL Secrets (Non-Negotiable)

| Service | Rotation Steps |
|---------|---------------|
| **Supabase** | Dashboard → Settings → API → Reset service_role key. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel |
| **Clerk** | Dashboard → API Keys → Roll secret. Update `CLERK_SECRET_KEY` in Vercel |
| **Cashfree** | Dashboard → API Keys → Generate new. Update `CASHFREE_APP_ID` + `CASHFREE_SECRET_KEY` in Vercel |
| **Upstash** | Dashboard → CLI/API → Reset token. Update `UPSTASH_REDIS_REST_TOKEN` in Vercel |
| **Resend** | Dashboard → API Keys → Create new, revoke old. Update `RESEND_API_KEY` in Vercel |

### Step 5: Set in Vercel Env Variables

```bash
vercel env pull  # verify local matches production
# Or set individually:
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CLERK_SECRET_KEY
# ... etc
```

### Step 6: Verify

```bash
# Confirm no env files in repo
rtk git log --all --full-history -- "*.env*" | head -5
# Confirm .gitignore works
echo "test" > .env.local && rtk git status  # should NOT show .env.local
rm .env.local
```

## Affected Files

| File | Action |
|------|--------|
| `.gitignore` | Add `.env.local`, `.env`, `.env*.local` |
| `.env.local` | Remove from git tracking + history |
| `.env.example` | Keep — no real secrets, only placeholders |

## Links

- [[fix-plan-master]] — master plan
- [[security-posture]] — broader security context