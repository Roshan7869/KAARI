# 📋 Admin Review Management System - Complete Guide

## Overview

This system gives you **complete control** over product reviews. You can:
- ✅ **Approve/Reject** reviews before they appear
- 👁️ **Toggle visibility** - show/hide specific reviews anytime
- ⭐ **Feature reviews** - pin important reviews to top
- 📊 **Search & filter** - by customer, product, rating, date, etc.
- 📝 **Audit trail** - track all admin actions with timestamps
- 🎯 **Manage placement** - control where reviews appear on product pages

---

## Database Schema

### Tables Created

#### 1. `review_visibility`
Controls which reviews show and where they appear.

```sql
Fields:
- id (UUID)
- review_id (UUID) - Links to product_reviews
- product_id (UUID) - Which product this review is for
- is_visible (boolean) - Show/hide toggle
- display_priority (int) - Lower number = higher priority (1 = top)
- placement_type (enum) - 'featured' | 'normal' | 'hidden'
- admin_notes (text) - Internal notes about this review
- visibility_set_by (UUID) - Admin who set visibility
- visibility_updated_at (timestamp) - When visibility was set
- last_modified_by (UUID) - Admin who last modified
- last_modified_at (timestamp) - When last modified
- created_at (timestamp)
```

#### 2. `review_visibility_audit`
Immutable log of all review management changes.

```sql
Fields:
- id (UUID)
- review_id (UUID)
- admin_id (UUID) - Who made the change
- action (enum) - 'toggle' | 'reorder' | 'move_product' | 'note_added'
- old_value (JSONB) - Previous state
- new_value (JSONB) - New state
- reason (text) - Why the change was made
- created_at (timestamp)
```

### RLS Policies (How Access is Controlled)

```
┌─────────────────────────────────────────┐
│ Admin Dashboard                         │
├─────────────────────────────────────────┤
│ Can see: ALL reviews (pending/approved) │
│ Can do: Manage visibility/placement     │
│ Can see: Full audit trail               │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Product Page (Public)                   │
├─────────────────────────────────────────┤
│ Can see: ONLY visible approved reviews  │
│ Sorted: Featured → Priority → Recent    │
│ No access: Admin controls               │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ User's Own Reviews                      │
├─────────────────────────────────────────┤
│ Can see: Own reviews (any status)       │
│ Can do: Edit before approved            │
│ Cannot see: Admin notes/visibility      │
└─────────────────────────────────────────┘
```

---

## Components Architecture

### Admin Pages & Components

```
/admin/reviews/page.tsx (Main Dashboard)
├── AdminReviewFilters.tsx (Search & Filter UI)
├── AdminReviewList.tsx (Review Cards with controls)
└── AdminReviewAuditLog.tsx (Change History)
```

### User-Facing Components

```
ProductReviews.tsx (Product Page)
├── Uses: useProductReviews hook
├── Shows: Only visible, approved reviews
├── Features: Sort by Featured/Recent/Helpful
└── Respects: Admin visibility & placement settings
```

---

## Setup Instructions

### Step 1: Run Migration

```bash
# The migration file creates all tables, functions, triggers, and RLS policies
supabase migration up

# Or manually in Supabase dashboard:
# Analytics → SQL Editor → Paste migration file content → Run
```

### Step 2: Add Navigation Link to Admin Dashboard

In your admin navigation (e.g., `components/AdminNav.tsx` or `app/admin/layout.tsx`):

```tsx
<nav>
  {/* Existing admin links */}
  <Link href="/admin/reviews" className="px-4 py-2 hover:bg-gray-100">
    Reviews Management
  </Link>
</nav>
```

### Step 3: Verify RLS is Enabled

After running migration, check in Supabase:
1. Go to **Tables** → `review_visibility` → **Auth Policies**
2. Should see:
   - ✅ `Admins can manage all review visibility`
   - ✅ `Users can view visibility of approved reviews`

---

## How to Use

### As an Admin

#### 1. **Review Management Dashboard**
```
Navigate to: /admin/reviews
```

**Dashboard shows:**
- Total reviews count
- Visible reviews count
- Hidden reviews count
- Pending approvals count

#### 2. **Search & Filter Reviews**

Open filters panel:
- 🔍 **Search**: Title, content, customer name
- 📦 **By Product**: Filter by specific product
- 👤 **By Customer**: Search by name/email
- ⭐ **By Rating**: 1-5 stars
- ✅ **By Status**: Pending, Approved, Rejected
- 👁️ **By Visibility**: Visible, Hidden, All
- 📅 **By Date Range**: From/To dates

Example: "Find all 5-star reviews from March that are currently hidden"

#### 3. **Approve/Reject Reviews**

**Pending Reviews** show approval buttons:
```
┌─────────────────────────┐
│ Review Title            │
│ ⭐⭐⭐⭐⭐ (5/5)          │
│ "Amazing product!"      │
│                        │
│ [✓ Approve] [✗ Reject] │
└─────────────────────────┘
```

Clicking **Approve**:
1. Review status changes to "approved"
2. `review_visibility` record auto-created
3. Audit log entry recorded
4. User can see their review on product page

#### 4. **Manage Visibility**

For approved reviews, control visibility:

```
[👁️ Visible] ← Click to hide
[🔒 Hidden]  ← Click to show
```

All actions logged automatically.

#### 5. **Feature/Prioritize Reviews**

Approved reviews show placement dropdown:

```
Placement:
├─ ⭐ Featured (shown first, highlighted)
├─ 📄 Normal (regular sorting)
└─ 🔒 Hidden (admin only)
```

And priority number (1 = top, 999 = bottom):

```
Display Order: [45] ← Lower number = higher position
```

#### 6. **Bulk Actions**

Select multiple reviews (checkboxes) → use bulk actions:
- Toggle visibility for all selected
- Set same priority for batch
- Change placement type

#### 7. **View Audit Log**

Click "Show Change Log" to see:
- Who made changes
- When changes were made
- What changed (old → new values)
- Why (reason field)

Example log entry:
```
👁️ Visibility Toggled
by Sarah (admin)
Review: "Best crochet ever!"
Visibility: Visible → Hidden
2024-04-04 at 3:45 PM
Reason: "Customer requested removal"
```

---

## User Flow (Customers)

### Submitting a Review

```
1. Customer clicks "Write a Review" on product page
2. Fills form: Title, Rating, Content
3. Submits → Review status = "pending"
4. Page shows: "Review submitted! Awaiting admin approval"
5. Customer can see own reviews (any status) in account
```

### Public Display

```
1. Review stays in "pending" state
2. Admin reviews and approves
3. Review visibility record created
4. Review now appears on product with:
   - Customer name
   ✓ Verified Purchase badge (if applicable)
   - Rating stars
   - Review content
   - Optional: ⭐ Featured badge if prioritized
```

---

## Advanced Use Cases

### Use Case 1: Hide Spam/Inappropriate Reviews
```
1. Go to /admin/reviews
2. Search: "any spam text or customer name"
3. Find problematic review → Click status settings
4. Click [👁️ Visible] → becomes [🔒 Hidden]
5. Review hidden from public immediately
6. Audit log records the change
```

### Use Case 2: Promote Best Reviews
```
1. Find reviews you want featured
2. Select multiple ✓
3. Set all to "⭐ Featured"
4. Set priority to low numbers (1, 2, 3)
5. These appear at top of product page
```

### Use Case 3: Seasonal Review Management
```
1. Filter by Date Range: "Last month"
2. Approve relevant reviews
3. Hide old/outdated reviews
4. Feature recent positive ones
```

### Use Case 4: Customer-Specific Handling
```
1. Filter by Customer: "problematic_customer@email.com"
2. See all their reviews
3. Check audit log for pattern
4. Make batch decisions
```

---

## Performance Optimization

### Indexes Created
```sql
-- All optimized with WHERE clauses for visibility queries
- idx_review_visibility_product_id
- idx_review_visibility_visible (filters where is_visible = true)
- idx_review_visibility_placement
- idx_review_visibility_audit_review
- idx_review_visibility_audit_admin
```

### Query Optimization
- Approval queries filtered by status
- Product page queries only fetch visible reviews
- Audit log soft-limited to 50 entries

### Caching Strategy
```tsx
// useProductReviews hook includes:
const { reviews, loading, error, refetch } = useProductReviews(productId);
// Auto-refetch on visibility changes
```

---

## Security & Best Practices

### Immutable Audit Trail
- ✅ All changes logged in `review_visibility_audit`
- ✅ Cannot be deleted by non-superusers
- ✅ Tracks admin ID, timestamp, old/new values

### RLS Protection
- ✅ Customers can only see approved visible reviews
- ✅ Customers can see their own reviews
- ✅ Only admins can modify visibility
- ✅ Unauthenticated users see only approved visible

### Admin Accountability
- ✅ Every change records: WHO, WHEN, WHAT, WHY
- ✅ Compare visibility_set_by vs last_modified_by
- ✅ Track pattern of admin actions

---

## Troubleshooting

### Problem: Reviews not appearing after approval
```
Solution:
1. Check review status: SELECT status FROM product_reviews WHERE id = '...';
   Should be: status = 'approved'
2. Check visibility: SELECT is_visible FROM review_visibility WHERE review_id = '...';
   Should be: is_visible = true
3. Check RLS policies are enabled
```

### Problem: Admin dashboard showing no reviews
```
Solution:
1. Verify admin role: SELECT * FROM user_roles WHERE user_id = '<your_id>';
   Should have: role = 'admin'
2. Check RLS policies:
   SELECT * FROM pg_policies WHERE tablename = 'product_reviews';
3. Try refreshing page (hard refresh: Ctrl+Shift+R)
```

### Problem: Audit log not showing changes
```
Solution:
1. Verify trigger exists: SELECT * FROM pg_triggers WHERE tgname = 'trigger_log_review_visibility_change';
2. Check that you're admin (non-admins can't see audit)
3. Wait 2-3 seconds after making change (async trigger)
```

---

## Key Features Summary

| Feature | Admin | Customer | Public |
|---------|-------|----------|--------|
| Submit review | ✓ | ✓ | ✗ |
| View own reviews | ✓ | ✓ | ✗ |
| View approved visible | ✓ | ✓ | ✓ |
| Approve reviews | ✓ | ✗ | ✗ |
| Toggle visibility | ✓ | ✗ | ✗ |
| Feature reviews | ✓ | ✗ | ✗ |
| See audit log | ✓ | ✗ | ✗ |
| Search all reviews | ✓ | ✗ | ✗ |
| Filter reviews | ✓ | ✗ | ✗ |

---

## TypeScript Types

```typescript
// types/review.ts
export interface ReviewData {
  id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  is_featured: boolean;
  display_priority: number;
}

export interface ReviewVisibility {
  id: string;
  review_id: string;
  product_id: string;
  is_visible: boolean;
  display_priority: number;
  placement_type: 'featured' | 'normal' | 'hidden';
  admin_notes?: string;
  visibility_set_by: string;
  last_modified_by: string;
  last_modified_at: string;
}

export interface ReviewAuditEntry {
  id: string;
  review_id: string;
  admin_id: string;
  action: 'toggle' | 'reorder' | 'move_product' | 'note_added';
  old_value: Record<string, any>;
  new_value: Record<string, any>;
  reason?: string;
  created_at: string;
}
```

---

## Next Steps

1. ✅ Run migration in Supabase
2. ✅ Verify RLS policies
3. ✅ Add navigation link to /admin/reviews
4. ✅ Test with sample reviews
5. ✅ Train admin team on dashboard

**Questions?** Check the migration file for exact schema details.
