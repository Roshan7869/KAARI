# Payment & Database Sync Flow Review

## Executive Summary
The payment and database synchronization flows are **partially implemented**. While the architecture supports multiple payment methods and has stable order/inventory management via database triggers, the actual payment gateway integration and advanced payment workflows are **incomplete**.

---

## 1. PAYMENT FLOW ANALYSIS

### 1.1 Current Implementation

#### Checkout Entry Point: [Checkout.tsx](src/pages/Checkout.tsx)
- **Payment Method Selection** (Lines 27-33): UI supports 5 methods:
  - ✅ UPI
  - ✅ Card (Credit/Debit)
  - ✅ Net Banking
  - ✅ Wallet
  - ✅ Cash on Delivery (COD)

#### Order Creation RPC: [20260314101500_seed_catalog_and_stock_checkout_rpc.sql](supabase/migrations/20260314101500_seed_catalog_and_stock_checkout_rpc.sql)

**Function Name**: `public.create_order_from_cart()`

**Key Steps in Order Creation**:
1. **Authentication Check** - Validates user is authenticated
2. **Cart Validation** - Locks cart for update, checks items exist
3. **Stock Validation** - Verifies sufficient inventory for each item (Lines 110-135)
4. **Payment Status Logic** (Lines 157-166):
   ```
   IF payment_provider = 'cod' THEN
     order_status = 'placed'
     payment_status = 'pending'
     checkout_status = 'completed'
   ELSE
     order_status = 'payment_pending'
     payment_status = 'initiated'
     checkout_status = 'payment_pending'
   ```
5. **Checkout Session Creation** - Stores all shipping/contact details
6. **Order Record Creation** - Creates order with calculated totals
7. **Order Items Creation** - Creates line items with customization snapshots
8. **Payment Record Creation** - Inserts payment with status 'created'
9. **Stock Deduction** - Reduces inventory for ordered variants
10. **Cart Conversion** - Marks cart as 'converted', clears items

#### Order Confirmation: [OrderConfirmation.tsx](src/pages/OrderConfirmation.tsx)
- Displays order number, status, payment status, and total
- Fetches from `orders` table (read-only query)

### 1.2 Critical Gaps

#### ❌ **Gap 1: No Payment Gateway Integration**
- **Issue**: Non-COD payment methods (card, UPI, etc.) are collected but not processed
- **Missing**: 
  - No Razorpay/Stripe/PayU API calls
  - No redirect to payment gateway
  - No webhook handlers for payment confirmation
  - No idempotency keys for duplicate prevention

- **Current Behavior**:
  - Order created with `payment_status = 'initiated'`
  - User navigated to confirmation page
  - **No actual payment is processed**

#### ❌ **Gap 2: No Payment Webhook Handlers**
- Missing webhook endpoint to handle:
  - ✅ Payment success → Update `payment_status` to 'completed'
  - ✅ Payment failed → Update `payment_status` to 'failed', consider order cancellation
  - ✅ Payment timeout → Retry logic needed
  - ✅ Duplicate requests → Idempotency handling

#### ❌ **Gap 3: No Failure Recovery**
- **Missing Workflows**:
  - Retry mechanism for failed payments
  - Refund processing for cancelled orders
  - Payment cancellation cleanup (inventory restoration)
  - Timeout handling (how long to wait for payment before cancelling)

#### ❌ **Gap 4: No Payment History/Status Tracking**
- `payments` table is populated with status='created' only
- No mechanism to update payment status after transaction
- No transaction ID/external payment reference storage

---

## 2. DATABASE SYNC FLOW ANALYSIS

### 2.1 Core Architecture

#### Schema Structure:

```
Users (via Supabase Auth)
  ↓
  ├→ Carts (active/converted)
  │   └→ Cart Items (standard/customized)
  │       └→ Cart Item Customizations + Uploads
  │
  ├→ Orders (final transaction record)
  │   ├→ Order Items (snapshot of cart items)
  │   ├→ Payments (payment status tracking)
  │   └→ Order Status Events (history)
  │
  └→ Products/Variants (inventory)
      └→ Stock Qty (decremented on order)
```

### 2.2 Inventory Management (✅ WELL IMPLEMENTED)

#### Stock Deduction Flow:
1. **Atomic Transaction**: RPC function uses `FOR UPDATE` locks
2. **Pre-Order Check**: [Lines 110-135 of RPC]
   - Validates variant exists
   - Verifies stock >= order quantity
3. **Stock Update**: [Lines 305-309]
   ```sql
   UPDATE public.product_variants
   SET stock_qty = stock_qty - v_cart_item.quantity
   WHERE id = v_variant_id;
   ```
4. **No Race Conditions**: Database locks prevent overselling

#### Issue: **No Inventory Restoration on Payment Failure**
- If payment fails, inventory is NOT returned
- Solution needed: Webhook should restore stock if payment fails

### 2.3 Data Consistency (✅ MOSTLY SOLID)

#### Strong Points:
- ✅ RLS (Row Level Security) enforced on all tables
- ✅ Foreign key constraints
- ✅ Timestamp tracking (created_at, updated_at)
- ✅ Customization snapshots stored in order_items
- ✅ Cart → Order conversion is atomic

#### Weak Points:
- ❌ No order status event history for non-admin users
- ❌ Payment status not automatically synced from external gateway
- ❌ No audit log for inventory changes
- ❌ Timeout handling (stale 'payment_pending' orders)

### 2.4 Cart-to-Order Sync

**Process in RPC [20260314101500]**:

1. **Retrieve Cart Items** with relations (products, customizations)
2. **Create Order** with calculated pricing
3. **Create Order Items** with customization_snapshot as JSONB
4. **Clear Cart Items** via DELETE
5. **Mark Cart as Converted** (status = 'converted')

**Customization Snapshot** (Lines 334-348):
```jsonb
{
  "message": "Custom message",
  "preferredSize": "M",
  "preferredColor": "Red",
  "preferredMaterial": "Cotton",
  "deliveryDeadline": "2026-03-25",
  "budgetMin": 500,
  "budgetMax": 1000
}
```

**Issue**: No two-way sync
- Changes to stored customization don't propagate back to frontend
- No status tracking for quote approval workflow

---

## 3. DATA FLOW DIAGRAM

```
CHECKOUT PAGE (Checkout.tsx)
    ↓
    [Form Collection: Email, Phone, Address, Payment Method]
    ↓
    Call RPC: create_order_from_cart()
         ↓
         [1. Validate user authenticated]
         ↓
         [2. Lock cart, retrieve items]
         ↓
         [3. Check stock availability]
         ↓
         [4. Set order/payment status based on method:]
         │   COD → order_status='placed', payment_status='pending'
         │   OTHERS → order_status='payment_pending', payment_status='initiated'
         ↓
         [5. Create checkout_sessions record]
         ↓
         [6. Create orders record with totals]
         ↓
         [7. Create order_items with customization snapshots]
         ↓
         [8. CREATE payments record (status='created')]
         ↓
         [9. Deduct inventory from product_variants]
         ↓
         [10. Clear cart items, mark cart 'converted']
         ↓
         Return: {order_id, checkout_session_id, order_number}
    ↓
    [Navigate to OrderConfirmation with order_id]
    ↓
    Display order details from orders table
```

---

## 4. CRITICAL ISSUES & RECOMMENDATIONS

### Priority 1: Payment Gateway Integration (HIGH - BLOCKING)

#### Issue: No actual payment processing
**Impact**: Orders created but payment never collected

**Solution**:
```typescript
// In Checkout.tsx handleSubmit()
if (formData.paymentMethod !== 'cod') {
  // After order creation, redirect to payment gateway
  const { data: paymentLink } = await supabase.functions.invoke('create-razorpay-order', {
    body: { order_id: result.order_id, amount: cart.pricing.total }
  });
  // Redirect to payment gateway
  window.location.href = paymentLink.short_url;
}
```

**Required Components**:
1. **Payment Gateway Provider Function** (Supabase Edge Function or API)
2. **Webhook Handler** for payment confirmation
3. **Payment Status Updater** (triggered by webhook)
4. **Idempotency Key Generator** for duplicate handling

---

### Priority 2: Webhook Handlers for Payment Updates

#### Missing: POST /webhooks/payment

```sql
-- Webhook payload structure (from Razorpay/Stripe)
{
  "event": "payment.authorized|payment.failed|payment.captured",
  "payload": {
    "payment": {
      "id": "external_payment_id",
      "entity": "payment",
      "amount": 5000,
      "status": "captured|failed"
    }
  }
}

-- Database update needed:
UPDATE payments
SET 
  status = 'completed|failed',
  external_reference_id = payload.payment.id,
  updated_at = now()
WHERE order_id = (SELECT order_id FROM orders WHERE checkout_session_id = ?)

UPDATE orders
SET payment_status = 'completed|failed'
WHERE id = ? AND payment_status = 'initiated'
```

---

### Priority 3: Inventory Restoration on Payment Failure

#### Issue: Stock decremented even if payment fails

**Solution**: Trigger function to restore inventory

```sql
CREATE OR REPLACE FUNCTION restore_inventory_on_payment_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' AND OLD.status IN ('created', 'initiated') THEN
    -- Restore stock for all items in this order
    UPDATE product_variants pv
    SET stock_qty = stock_qty + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.order_id
    AND oi.variant_id = pv.id;
    
    -- Cancel the order
    UPDATE orders SET status = 'cancelled' WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_restore_inventory_on_payment_fail
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION restore_inventory_on_payment_failure();
```

---

### Priority 4: Handle Stale Orders (Timeout)

#### Issue: 'payment_pending' orders that never complete

**Solution**: Add cleanup function

```sql
-- Clean up orders pending payment for >24 hours
CREATE OR REPLACE FUNCTION cleanup_stale_orders()
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled'
  WHERE payment_status = 'initiated'
  AND status = 'payment_pending'
  AND created_at < now() - INTERVAL '24 hours';
  
  -- Also restore inventory for cancelled orders
  UPDATE product_variants pv
  SET stock_qty = stock_qty + oi.quantity
  FROM order_items oi
  WHERE oi.order_id IN (
    SELECT id FROM orders 
    WHERE status = 'cancelled' AND payment_status = 'initiated'
  )
  AND oi.variant_id = pv.id;
END;
$$ LANGUAGE plpgsql;

-- Schedule via cron (Supabase extension):
-- SELECT cron.schedule('cleanup-stale-orders', '0 * * * *', 'SELECT cleanup_stale_orders()');
```

---

### Priority 5: Cart Context Sync

#### Issue: Cart might not refresh after checkout

**Current Code** ([CartContext.tsx](src/contexts/CartContext.tsx)):
```typescript
await refreshCart();  // Called in Checkout.tsx after order creation
```

**Recommendation**: Verify refreshCart() properly invalidates cache:
```typescript
const refreshCart = useCallback(async () => {
  // Should invalidate React Query cache + refetch
  queryClient.invalidateQueries({ queryKey: ['cart'] });
  const newCart = await getOrCreateActiveCart(userId);
  setCart(newCart);
}, [userId]);
```

---

## 5. SECURITY REVIEW

### ✅ Row Level Security (RLS) - Well Implemented
```sql
-- Users can only see their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Users can only insert orders for themselves
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### ✅ RPC Security - SECURITY DEFINER
```sql
CREATE OR REPLACE FUNCTION public.create_order_from_cart(...)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner's permissions
SET search_path = public
AS $$
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in to continue checkout.';
  END IF;
  -- Always validates auth.uid() matches cart owner
```

### ⚠️ Webhook Security - Not Yet Implemented
**Required for payment webhooks**:
1. **HMAC Signature Verification** - Validate webhook is from payment provider
2. **Webhook Secret** - Store securely in environment
3. **Request Idempotency** - Check for duplicate webhook calls
4. **Timestamp Validation** - Ensure webhook is recent (prevent replay attacks)

---

## 6. TESTING RECOMMENDATIONS

### Unit Tests Needed
- [ ] Order creation RPC with various inventory states
- [ ] Stock deduction accuracy
- [ ] Cart clearing after order conversion
- [ ] Customization snapshot serialization

### Integration Tests Needed
- [ ] End-to-end COD checkout flow
- [ ] Payment gateway redirect (mocked)
- [ ] Webhook handling (mocked)
- [ ] Inventory restoration on payment failure
- [ ] Duplicate webhook handling

### Manual Testing Checklist
- [ ] Create order with sufficient stock → stock decrements ✅
- [ ] Create order with insufficient stock → error shown ✅
- [ ] COD order → immediately confirmed ⚠️ (Not fully tested)
- [ ] Card payment → order created, status='payment_pending' (No test)
- [ ] Webhook success → payment_status='completed' (Not implemented)
- [ ] Webhook failure → inventory restored (Not implemented)

---

## 7. TIMELINE & DEPENDENCIES

**Phase 1 (Critical - 1-2 weeks)**:
- [ ] Integrate Razorpay/Stripe API
- [ ] Build payment gateway redirect flow
- [ ] Create webhook handler endpoint

**Phase 2 (High - 1 week)**:
- [ ] Implement inventory restoration on failure
- [ ] Add payment status webhook processor
- [ ] Build order timeout cleanup job

**Phase 3 (Medium - 1 week)**:
- [ ] Add HMAC webhook signature verification
- [ ] Implement idempotency key tracking
- [ ] Build admin payment reconciliation dashboard

---

## 8. SUMMARY TABLE

| Component | Status | Risk | Notes |
|-----------|--------|------|-------|
| Order Creation | ✅ Implemented | LOW | RPC is solid, atomic transactions |
| Stock Management | ✅ Implemented | LOW | No race conditions, proper locking |
| Cart Sync | ✅ Implemented | MEDIUM | Needs verification of cache invalidation |
| CoD Payments | ✅ Implemented | LOW | Takes full status flow |
| Card/UPI/etc | ❌ Incomplete | CRITICAL | No gateway integration |
| Payment Webhooks | ❌ Missing | CRITICAL | No webhook handlers |
| Failure Recovery | ❌ Incomplete | HIGH | Stock restoration missing |
| Timeout Handling | ❌ Missing | MEDIUM | Stale orders never cleaned |
| Payment Gateway Integration | ❌ Missing | CRITICAL | Blocking feature |

