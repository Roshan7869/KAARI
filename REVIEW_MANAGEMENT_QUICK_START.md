# 🚀 Quick Start Guide - Review Management System

## 5-Minute Setup

### Step 1: Run the Migration (2 min)
```bash
# Copy migration file path
supabase/migrations/20260404000000_review_visibility_and_placement.sql

# Option A: Supabase CLI
supabase db pull  # Sync your local migrations
supabase migration up

# Option B: Manual in Supabase Dashboard
1. Go to: SQL Editor
2. File → Open → Select the migration file
3. Click "Run"
```

### Step 2: Verify It Worked (1 min)
```bash
# Check tables exist
supabase db list-tables
# Should show: review_visibility, review_visibility_audit

# Or in Supabase Dashboard:
1. Go to Tables
2. Should see both new tables listed
```

### Step 3: Add Dashboard Link (1 min)

Find your admin navigation file and add:
```tsx
import Link from 'next/link';

export function AdminNav() {
  return (
    <nav>
      {/* existing links */}
      <Link href="/admin/products">Products</Link>
      
      {/* ADD THIS: */}
      <Link href="/admin/reviews" className="px-4 py-2 hover:bg-gray-100">
        Reviews
      </Link>
    </nav>
  );
}
```

### Step 4: Test It Works (1 min)
```
1. Open browser: http://localhost:3000/admin/reviews
2. You should see: Dashboard with 4 stats boxes
3. Stats will show: Total=0, Visible=0, Hidden=0, Pending=0 (no reviews yet)
```

---

## First Review Test Flow

### Test: Create & Approve Review

**1. Create a test review** (as customer)
```
1. Go to any product page
2. Click "Write a Review" button
3. Enter:
   - Title: "Test Review"
   - Rating: 5 stars
   - Content: "This is a test review"
4. Click Submit
```

**2. Approve it** (as admin)
```
1. Go to /admin/reviews
2. You should see 1 pending review in the box
3. Click "Filter" → Status → Select "Pending"
4. Click [✓ Approve]
```

**3. Verify on product page**
```
1. Go back to product page
2. Scroll to "Customer Reviews" section
3. Your test review should appear!
```

---

## Common First Admin Tasks

### Task 1: Approve Multiple Pending Reviews
```
1. Go to /admin/reviews
2. Filter by Status: "Pending"
3. Approve each one individually (per-review buttons)
   OR use checkboxes for bulk
```

### Task 2: Hide an Inappropriate Review
```
1. Filter by Customer name (if you know them)
2. Find the review
3. Click [👁️ Visible] → becomes [🔒 Hidden]
4. Review immediately hidden from product page
```

### Task 3: Feature Your Best Reviews
```
1. Find 3-5 best reviews
2. Set each to:
   - Placement: ⭐ Featured
   - Priority: 1, 2, 3 (lower = higher)
3. These will appear first on product page
```

### Task 4: Check Recent Admin Changes
```
1. Go to /admin/reviews
2. Scroll down
3. Click "Show Change Log"
4. See all modifications with timestamps
```

---

## Admin Dashboard Overview

### The 4 Stat Boxes
```
┌─────────────────────────────────────────────────┐
│ Total Reviews  │ Visible   │ Hidden  │ Pending  │
│      45        │    38     │    7    │    2     │
└─────────────────────────────────────────────────┘
```

### The Filter Panel
```
[Filters] ▼ (Click to expand)

Search box: "search title, content, customer..."
Product: [______]
Customer: [______]
Rating: [All ▼]
Status: [All ▼]
Visibility: [All ▼]
Date From: [____]
Date To: [____]

[Reset Filters]
```

### The Review Cards
```
For PENDING reviews:
┌─────────────────────────────────────┐
│ ☐ Great Product!                    │
│ ⭐⭐⭐⭐⭐ (5/5)                      │
│ By: Sarah Johnson                   │
│ "This product is amazing! Highly... │
│                                     │
│ [✓ Approve] [✗ Reject]             │
└─────────────────────────────────────┘

For APPROVED reviews:
┌─────────────────────────────────────┐
│ ☐ Best Crochet Ever!                │
│ ⭐⭐⭐⭐⭐ (5/5)                      │
│ By: Mike Chen • Product: Blanket    │
│ "Absolutely the best quality I've..│
│                                     │
│ Visibility:  [👁️ Visible]            │
│ Placement:   [⭐ Featured ▼]         │
│ Order:       [2]                    │
│ Notes:       [internal use only]    │
└─────────────────────────────────────┘
```

---

## Keyboard Shortcuts (Pro Tips)

```
Filter Panel Shortcuts:
- Ctrl+F: Focus search box
- Tab: Jump between filters
- Enter: Apply filters

Admin Actions:
- Click review card → Expands
- Checkbox → Select for bulk
- Hold Shift + Click → Select range
```

---

## Troubleshooting First Setup

### Problem: Dashboard Returns 404
```
Solution:
1. Check admin role: Is your user an admin?
2. In Supabase → SQL Editor, run:
   SELECT * FROM user_roles WHERE user_id = 'your_user_id';
3. If no results, add admin role:
   INSERT INTO user_roles (user_id, role) 
   VALUES ('your_user_id', 'admin');
```

### Problem: No Reviews Showing in Dashboard
```
Solution:
1. Make sure reviews exist:
   SELECT COUNT(*) FROM product_reviews;
2. Check migration ran:
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'review_visibility';
3. Try hard refresh: Ctrl+Shift+R
```

### Problem: Review Doesn't Appear After Approve
```
Solution:
1. Check status is "approved":
   SELECT status FROM product_reviews WHERE id = '...';
2. Check is_visible is true:
   SELECT is_visible FROM review_visibility WHERE review_id = '...';
3. Check RLS not blocking:
   SELECT * FROM product_reviews 
   WHERE id = '...' AND deleted_at IS NULL;
```

---

## Accessing Different Roles

### As Admin
```
URL: /admin/reviews
See: All reviews, all controls
Can: Approve, Hide, Feature, Delete
```

### As Customer
```
Product page: Can see approved + visible reviews
Account → My Reviews: See all your reviews (pending, approved, rejected)
```

### As Public (Not Logged In)
```
Product page: See only approved + visible reviews
Cannot: Submit reviews, see pending reviews
```

---

## What Happens Behind the Scenes

### When You Approve a Review
```
1. Click [✓ Approve]
2. Review status → "approved"
3. Trigger fires → Creates review_visibility record
   - is_visible = true
   - priority = 999
   - placement = normal
4. Audit log entry created:
   - action = "approved"
   - admin_id = your_id
   - timestamp = now
5. Database returns success
6. UI updates immediately
```

### When You Toggle Visibility
```
1. Click [👁️ Visible]
2. is_visible flips to false
3. Trigger fires → Log change to audit
   - admin_id = your_id
   - action = "toggle"
   - old_value = {is_visible: true}
   - new_value = {is_visible: false}
4. Product page queries execute, see is_visible=false
5. Review disappears from public product page
6. Audit trail shows the change with timestamp
```

---

## Performance Tips

1. **Use Filters**: Don't load all reviews, use filters
2. **Bulk Operations**: Select multiple instead of one-by-one
3. **Archive Old**: Hide reviews older than 1 year
4. **Feature Quarterly**: Every quarter, re-feature top reviews

---

## Support Resources

📖 **Full Guide**: `REVIEW_MANAGEMENT_SYSTEM.md`
📊 **Implementation Docs**: `REVIEW_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
🗂️ **Database Schema**: Check migration file

**Questions**: Read the docs first, they cover ~95% of use cases.

---

## Ready to Go! 🎉

You now have:
✅ Dashboard at /admin/reviews
✅ Review approval workflow
✅ Visibility & placement control
✅ Audit trail for accountability
✅ Advanced search & filtering
✅ All data in PostgreSQL (your control)

**Next**: Test with a sample review, then invite your team! 🚀
