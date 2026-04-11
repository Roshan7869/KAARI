# TypeScript Fixes Needed for Cron Jobs

## Issues Identified:

1. **Email Queue Cron Job** (`app/api/cron/send-emails/route.ts`):
   - `email_queue` table not recognized in TypeScript types
   - Database column references causing compile errors
   - Need to regenerate database types after migration deployment

2. **Cleanup Orders Cron Job** (`app/api/cron/cleanup-orders/route.ts`):
   - Database function call `increment_product_stock` not recognized
   - Need to verify the existence of this database function or replace with proper stock management

## Resolution Steps:

### Step 1: Deploy Database Migrations
Deploy the new database migrations to production/staging environment:
- `supabase/migrations/20260409050000_create_email_queue_table.sql`
- Ensure all database changes are applied

### Step 2: Regenerate TypeScript Types
Regenerate the TypeScript database types:
```bash
# Command to regenerate types (depends on project setup)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### Step 3: Fix Implementation Code
Update the cron job implementations to use proper database access patterns:
- Use existing patterns from working components as reference
- Ensure database calls match the regenerated types
- Test the cron jobs in development environment

## Alternative Approach:
If regenerating types is complex, update the implementation to use the same database access patterns as other working components in the codebase, focusing on:
- Using explicit column selection instead of `select('*')`
- Matching function names to existing database functions
- Following the established error handling patterns