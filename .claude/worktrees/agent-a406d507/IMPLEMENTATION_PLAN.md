# Kaari Marketplace - Full E-commerce Implementation Plan

## Executive Summary

This plan transforms Kaari Marketplace from a basic storefront into a fully functional production e-commerce platform with real-time operations, admin management, and payment integration.

---

## Step 0: Scope Challenge

### What Already Exists
| Feature | Status | Location |
|---------|--------|----------|
| Product browsing | ✅ Complete | `ProductGridDb.tsx`, `ProductCard.tsx` |
| Cart functionality | ✅ Complete | `CartContext.tsx` (stock validation, Supabase sync) |
| Checkout flow | ✅ Complete | `Checkout.tsx` (create_order_from_cart RPC) |
| User auth | ✅ Complete | `AuthContext.tsx` (Supabase Auth) |
| Order creation | ✅ Complete | `create_order_from_cart` RPC |
| Dummy payment | ⚠️ Placeholder | `payment.ts`, `webhook.ts` |
| Admin dashboard | ⚠️ Basic stats only | `Admin.tsx` |

### Minimum Viable Product (MVP)
The **core goal** is: functional admin operations + real payment processing.

**Phase 1 (Critical)**: Admin product management + real payment integration
**Phase 2 (Important)**: Customer profile, order history, enhanced product display
**Phase 3 (Enhancement)**: Real-time inventory, customization workflow, reviews

---

## Phase 1: Core Admin Operations & Payment

### 1.1 Admin Product Management

**Files to Create:**
```
src/pages/admin/
├── AdminProducts.tsx      # Product list with search/filter
├── AdminProductForm.tsx   # Create/Edit product
├── AdminProductVariants.tsx # Manage variants
└── AdminLayout.tsx        # Shared admin layout with nav

src/lib/
└── admin.ts               # Admin helper functions

src/hooks/
└── useAdminProducts.ts    # Product CRUD queries
```

**Files to Modify:**
- `src/App.tsx` - Add admin route children
- `src/pages/Admin.tsx` - Add navigation to sub-pages

**Database Changes:**
```sql
-- Add slug uniqueness constraint
ALTER TABLE products ADD CONSTRAINT unique_slug UNIQUE (slug);

-- Add index for admin queries
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_orders_status ON orders(status);
```

**Component Architecture:**
```
AdminLayout
├── AdminNav (sidebar with links)
│   ├── Dashboard
│   ├── Products
│   ├── Orders
│   └── Customers (Phase 2)
└── Outlet (React Router)
```

**Product CRUD Flow:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ AdminProducts│────▶│ProductForm   │────▶│ Supabase Storage│
│ (list view) │     │(create/edit) │     │ (image upload)  │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────────┐
       │           │ products table  │
       │           │ product_variants│
       │           │ product_media   │
       │           └─────────────────┘
       │
       ▼
┌─────────────┐
│ProductGridDb│ (public view updates automatically)
└─────────────┘
```

### 1.2 Admin Order Management

**Files to Create:**
```
src/pages/admin/
├── AdminOrders.tsx        # Order list with filters
├── AdminOrderDetail.tsx   # Order detail view
└── AdminOrderStatus.tsx   # Status update component
```

**Database RPC Functions:**
```sql
-- Get orders with details for admin
CREATE OR REPLACE FUNCTION get_admin_orders(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE (...) AS $$
  -- Implementation
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
  -- Implementation with status event logging
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Order Status Flow:**
```
┌─────────┐    ┌───────────┐    ┌─────────┐    ┌──────────┐
│ pending │───▶│processing│───▶│ shipped │───▶│delivered │
└─────────┘    └───────────┘    └─────────┘    └──────────┘
     │              │                │
     │              │                │
     ▼              ▼                ▼
┌──────────┐  ┌──────────┐   ┌───────────┐
│cancelled │  │  on_hold │   │returned   │
└──────────┘  └──────────┘   └───────────┘
```

### 1.3 Razorpay Payment Integration

**Files to Create:**
```
src/lib/
├── razorpay.ts           # Razorpay SDK integration
└── payment-config.ts     # Payment method configurations

src/components/
└── PaymentForm.tsx       # Razorpay checkout component
```

**Files to Modify:**
- `src/pages/Checkout.tsx` - Replace dummy payment with Razorpay
- `src/lib/webhook.ts` - Implement real signature validation
- `src/pages/DummyPayment.tsx` - Remove or keep as dev fallback

**Database Changes:**
```sql
-- Add Razorpay fields to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
```

**Payment Flow:**
```
┌──────────┐     ┌────────────┐     ┌─────────────┐
│ Checkout │────▶│Create Order│────▶│Create Razorpay│
│  Form    │     │(RPC)        │     │   Order      │
└──────────┘     └────────────┘     └─────────────┘
                        │                   │
                        │                   ▼
                        │           ┌─────────────┐
                        │           │Razorpay SDK │
                        │           │  Checkout   │
                        │           └─────────────┘
                        │                   │
                        ▼                   ▼
                 ┌──────────┐        ┌─────────────┐
                 │Order Table│        │Webhook Handler│
                 └──────────┘        └─────────────┘
```

**Environment Variables:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx (server-side only)
```

---

## Phase 2: Customer Experience

### 2.1 User Profile Management

**Files to Create:**
```
src/pages/
├── Profile.tsx           # User profile page
├── Addresses.tsx         # Address management
└── OrderHistory.tsx      # Past orders

src/contexts/
└── UserContext.tsx       # Extended user profile state

src/hooks/
└── useUserProfile.ts     # Profile queries
```

**Database Changes:**
```sql
-- User addresses table
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'IN',
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own addresses" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);
```

### 2.2 Enhanced Product Display

**Files to Modify:**
- `src/components/products/ProductGridDb.tsx` - Add search, sort, pagination
- `src/components/products/ProductCard.tsx` - Add rating display

**New Files:**
```
src/components/products/
├── ProductSearch.tsx     # Search input component
├── ProductFilters.tsx    # Category, price filters
└── ProductPagination.tsx # Pagination controls
```

**Database RPC:**
```sql
CREATE OR REPLACE FUNCTION search_products(
  p_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_limit INT DEFAULT 12,
  p_offset INT DEFAULT 0
) RETURNS TABLE (...) AS $$
  -- Full-text search implementation
$$ LANGUAGE plpgsql;
```

---

## Phase 3: Advanced Features

### 3.1 Real-time Inventory Alerts

**Files to Create:**
```
src/lib/
└── inventory-alerts.ts   # Low stock notification logic

src/components/admin/
└── LowStockAlert.tsx     # Admin notification component
```

**Database Trigger:**
```sql
-- Function to check and notify low stock
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_qty < 5 THEN
    INSERT INTO inventory_alerts (variant_id, current_stock, threshold)
    VALUES (NEW.id, NEW.stock_qty, 5);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on product_variants
CREATE TRIGGER low_stock_trigger
AFTER UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION check_low_stock();
```

### 3.2 Customization Quote Workflow

**Database Changes:**
```sql
-- Add quote fields
ALTER TABLE cart_item_customizations ADD COLUMN IF NOT EXISTS quote_amount NUMERIC;
ALTER TABLE cart_item_customizations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE cart_item_customizations ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ;
```

**Files to Create:**
```
src/pages/admin/
└── AdminQuotes.tsx       # Quote review queue

src/components/
└── QuoteApproval.tsx     # Quote approval component
```

### 3.3 Product Reviews

**Database:**
```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, user_id)
);
```

---

## Testing Requirements

### Unit Tests (Vitest)
- [ ] Product CRUD operations
- [ ] Order status transitions
- [ ] Payment webhook validation
- [ ] Stock validation logic
- [ ] Address CRUD

### Integration Tests
- [ ] Checkout flow end-to-end
- [ ] Payment success/failure paths
- [ ] Admin product management
- [ ] Order status updates

### E2E Tests (Playwright)
- [ ] Customer purchase journey
- [ ] Admin product creation
- [ ] Order fulfillment workflow

---

## Security Considerations

### Row Level Security Policies
```sql
-- Admin can manage all products
CREATE POLICY "Admins manage all products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can only see own orders
CREATE POLICY "Users see own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- Admins see all orders
CREATE POLICY "Admins see all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Input Validation
- All form inputs validated with Zod schemas
- File uploads validated (type, size)
- SQL injection prevention via parameterized queries

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Admin Products CRUD | High | Critical |
| P0 | Razorpay Integration | Medium | Critical |
| P0 | Admin Order Management | Medium | Critical |
| P1 | User Profile | Medium | High |
| P1 | Order History | Low | High |
| P1 | Product Search/Filter | Medium | High |
| P2 | Real-time Inventory | Medium | Medium |
| P2 | Quote Workflow | High | Medium |
| P2 | Reviews | Medium | Medium |

---

## File Change Summary

### New Files (Estimated)
```
src/pages/admin/           # ~8 files
src/components/admin/      # ~5 files
src/lib/                   # ~4 files
src/hooks/                 # ~3 files
src/contexts/              # ~1 file
```

### Modified Files
```
src/App.tsx               # Add admin routes
src/pages/Admin.tsx       # Add navigation
src/pages/Checkout.tsx   # Razorpay integration
src/lib/webhook.ts        # Real validation
src/lib/payment.ts        # Razorpay functions
```

### Database
- 2 new tables (user_addresses, product_reviews)
- 1 new trigger (low stock alert)
- 5 new RPC functions
- RLS policies updates

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 weeks | Supabase setup, Razorpay account |
| Phase 2 | 1-2 weeks | Phase 1 complete |
| Phase 3 | 2-3 weeks | Phase 2 complete |

**Total: 5-8 weeks** for full implementation