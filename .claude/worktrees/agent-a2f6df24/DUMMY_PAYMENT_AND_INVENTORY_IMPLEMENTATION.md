# Dummy Payment Flow & Inventory Management Implementation

## Overview

This document describes the complete dummy payment system and inventory management improvements implemented for the Kaari marketplace.

**Implementation Date**: March 14, 2026  
**Status**: ✅ Complete (Ready for Testing)

---

## 1. DUMMY PAYMENT FLOW

### Architecture

```
Checkout Page
    ↓
    [User selects payment method]
    ↓
    [Create order via RPC: create_order_from_cart()]
    ├─ Creates order (status: payment_pending)
    ├─ Creates order items
    ├─ Decrements inventory
    └─ Returns order_id
    ↓
    IF payment_method = 'cod':
        → Navigate to /order-confirmation/:orderId (ORDER COMPLETE)
    ELSE (card/upi/netbanking/wallet):
        → Generate dummy payment session
        → Redirect to /dummy-payment page
             ↓
             [Process payment (with optional failure simulation)]
             ↓
             Call payment-webhook Edge Function
             ↓
             Update order status
             ↓
             Navigate to /order-confirmation/:orderId
```

### Key Components Created

#### 1. **Payment Service** (`src/lib/payment.ts`)

Provides dummy payment session management:

```typescript
// Generate payment session
const session = generateDummyPaymentSession(
  orderId,
  amount,
  paymentMethod,
  { failureRate: 0, processingDelayMs: 1500 }
);

// Process payment
const result = await processPayment(sessionId, config);
// Returns: { success: boolean, transactionId: string, message: string }

// Get session details
const session = getDummyPaymentSession(sessionId);
```

**Features**:
- ✅ Session generation with 15-minute expiration
- ✅ Payment processing with configurable failure rate
- ✅ Transaction ID generation
- ✅ In-memory session storage (replace with Redis for production)
- ✅ Configurable network delay simulation

#### 2. **Dummy Payment Page** (`src/pages/DummyPayment.tsx`)

Interactive payment processing UI:

- **Features**:
  - ✅ Display order details (ID, amount, payment method)
  - ✅ Payment processing with loading states
  - ✅ Failure simulation checkbox (for dev testing)
  - ✅ Error handling and retry
  - ✅ Session validation and expiration handling
  - ✅ Responsive design with Framer Motion animations

#### 3. **Checkout Integration** (Updated `src/pages/Checkout.tsx`)

**Changes**:
- Added import for dummy payment library
- Modified `handleSubmit()` to:
  - Process COD orders directly → confirmation page
  - Generate payment sessions for other methods
  - Redirect to dummy payment page with return URL
  - Track payment info events for analytics

**Code Flow**:
```typescript
if (isCod) {
  // Direct order confirmation
  trackEvent('purchase', {...});
  navigate(`/order-confirmation/${orderId}`);
} else {
  // Redirect to payment gateway
  const session = generateDummyPaymentSession(orderId, total, method);
  const paymentUrl = generatePaymentPageUrl(sessionId, returnUrl);
  window.location.href = paymentUrl;  // Redirect to dummy payment
}
```

#### 4. **Webhook Handler** (`supabase/functions/payment-webhook/index.ts`)

Supabase Edge Function that processes payment results:

**Responsibilities**:
- ✅ Validates webhook payload
- ✅ Checks for duplicate requests (idempotency)
- ✅ Updates payment record with transaction ID
- ✅ Updates order status based on payment result
- ✅ Logs order status events
- ✅ Triggers database triggers for inventory restoration

**Webhook Payload**:
```json
{
  "session_id": "dummy_pay_...",
  "order_id": "uuid",
  "status": "completed|failed",
  "transaction_id": "txn_..."
}
```

**Response**:
```json
{
  "success": true,
  "orderId": "uuid",
  "paymentStatus": "completed|failed",
  "message": "..."
}
```

#### 5. **Payment Webhook Service** (`src/lib/webhook.ts`)

Client-side webhook processing utilities:

- `processPaymentWebhook()` - Main webhook processor
- `validateWebhookSignature()` - Signature validation (ready for real gateways)
- `schedulePaymentRetry()` - Handle payment retries
- `getOrderPaymentStatus()` - Fetch payment status

---

## 2. INVENTORY MANAGEMENT IMPROVEMENTS

### Database Migrations

**File**: `supabase/migrations/20260314120000_inventory_management_triggers.sql`

#### 2.1 Payment Tracking Columns

Added to `payments` table:
```sql
- external_transaction_id (TEXT UNIQUE) -- Maps to gateway transaction ID
- failure_reason (TEXT) -- Why payment failed
- retry_count (INT) -- Number of retry attempts
- last_retry_at (TIMESTAMPTZ) -- When last retry occurred
```

#### 2.2 Inventory Restoration Trigger

**Function**: `restore_inventory_on_payment_failure()`

**Behavior**:
- Triggered on payment status update → failed
- Restores stock for all items in the order:
  ```sql
  UPDATE product_variants
  SET stock_qty = stock_qty + quantity
  WHERE variant_id IN (SELECT variant_id FROM order_items WHERE order_id = ?)
  ```
- Cancels the order
- Logs status event with "inventory restored" note

**Trigger**: `tr_restore_inventory_on_payment_fail`

**Also handles**:
- Payment records created with `status='failed'`
- Via separate trigger: `tr_payment_insert_failed`

#### 2.3 Stale Order Cleanup

**Function**: `cleanup_stale_orders()`

**Purpose**: Clean up orders stuck in `payment_pending` state for > 24 hours

**Actions**:
1. Find all orders with `status='payment_pending'` AND `payment_status='initiated'` AND `created_at < now() - 24 hours`
2. Restore inventory for each item
3. Mark orders as `cancelled`
4. Log cleanup event

**Usage** (Should be scheduled via Supabase cron):
```sql
SELECT cleanup_stale_orders();
```

#### 2.4 Checkout Session Cleanup

**Function**: `cleanup_stale_checkout_sessions()`

**Purpose**: Cleanup abandoned checkout sessions (not converted in 30 minutes)

**Actions**:
1. Find sessions with `status IN ('draft', 'payment_pending')` AND `created_at < now() - 30 minutes`
2. Mark as `abandoned` (preserves audit trail)

#### 2.5 Performance Indexes

Created indexes for cleanup functions:
```sql
- idx_orders_payment_pending_timeout  -- ON orders(created_at) WHERE status='payment_pending'
- idx_checkout_sessions_abandoned     -- ON checkout_sessions(created_at) WHERE status IN (...)
- idx_payments_external_txn           -- ON payments(external_transaction_id)
```

---

## 3. ROUTER UPDATES

**File**: `src/App.tsx`

Added route:
```typescript
<Route path="/dummy-payment" element={<DummyPayment />} />
```

Placed before catch-all `*` route to ensure it's matched correctly.

---

## 4. PAYMENT FLOW WALKTHROUGH

### Scenario 1: COD Payment (Cash on Delivery)

```
1. User fills checkout form, selects "Cash on Delivery"
2. Clicks "Place COD Order"
3. Backend:
   - Validates user authenticated
   - Creates order (status: placed, payment_status: pending)
   - Creates order items
   - Deducts inventory
   - Returns order_id
4. Frontend:
   - Tracks 'purchase' event (analytics)
   - Navigates to /order-confirmation/:orderId
5. Order complete ✅
   - Status: placed
   - Payment method: cod
   - Payment status: pending (awaiting collection)
```

### Scenario 2: Card/UPI Payment (Success)

```
1. User fills checkout form, selects "Credit / Debit Card"
2. Clicks "Proceed to Payment"
3. Backend:
   - Creates order (status: payment_pending, payment_status: initiated)
   - Creates order items
   - Deducts inventory
   - Returns order_id
4. Frontend:
   - Generates dummy payment session
   - Redirects to /dummy-payment?session_id=...
5. Dummy Payment Page:
   - Shows order details
   - User clicks "Complete Payment"
   - Simulates payment processing (2 sec delay)
   - Calls payment-webhook with status: completed
6. Webhook Handler:
   - Updates payment record (status: completed)
   - Updates order record (status: paid, payment_status: completed)
   - Logs order status event
7. Frontend navigates to /order-confirmation/:orderId
8. Order complete ✅
   - Status: paid
   - Payment method: card
   - Payment status: completed
```

### Scenario 3: Card Payment (Failure)

```
1. User fills checkout form, selects payment method
2. Clicks "Proceed to Payment"
3. Backend:
   - Creates order (status: payment_pending, payment_status: initiated)
   - Deducts inventory
4. Frontend:
   - Redirects to dummy payment page
5. Dummy Payment Page:
   - User enables "Simulate payment failure" checkbox
   - Clicks "Complete Payment"
   - Payment processing fails
   - Calls payment-webhook with status: failed
6. Webhook Handler:
   - Updates payment record (status: failed)
   - Updates order record (status: cancelled)
   - Database trigger activates: RESTORE INVENTORY
     - Updates product_variants: stock_qty += ordered_quantity
7. Frontend shows error
8. User clicks "Back to Checkout"
   - Can retry or abandon cart
9. Inventory restored ✅
   - Status: cancelled
   - Stock available again for other customers
```

### Scenario 4: Payment Timeout (24+ hours)

```
1. Order created: 2026-03-13 15:30
   - Status: payment_pending
   - Payment status: initiated
   - Inventory deducted

2. Cron job runs daily (recommended at 00:00)
   SELECT cleanup_stale_orders();

3. Function detects:
   - Order is > 24 hours old
   - Still in payment_pending status
   - Payment never completed

4. Automatic actions:
   - Restore inventory for all items
   - Mark order as cancelled
   - Log cleanup event

5. Result:
   - User never completed payment
   - Stock released for other customers
   - No manual intervention needed ✅
```

---

## 5. TESTING CHECKLIST

### ✅ Unit Tests (Manual)

- [ ] Dummy payment service generates valid sessions
- [ ] Payment sessions expire after 15 minutes
- [ ] Transaction IDs are unique
- [ ] Failure rate simulation works (0%, 50%, 100%)
- [ ] Session validation blocks invalid sessionId

### ✅ Integration Tests (Manual)

- [ ] **COD Flow**: Order created → immediately confirmed
- [ ] **Card Flow Success**: Order → payment page → success → confirmation
- [ ] **Card Flow Failure**: Order → payment → fail → inventory restored → cancellation
- [ ] **Payment Timeout**: Stale order cleanup restores inventory
- [ ] **Duplicate Webhook**: Second webhook call returns cached result (idempotency)
- [ ] **Webhook Failure**: Database trigger still restores inventory

### ✅ UI/UX Tests

- [ ] Checkout form validation works
- [ ] Payment method selection updates button text
- [ ] Dummy payment page displays order details correctly
- [ ] Failure simulation checkbox toggles properly
- [ ] Loading states show during processing
- [ ] Error messages display when payment fails
- [ ] Back button works on payment failure
- [ ] Return URL redirects correctly after payment success

### Test Scenarios

#### 1. COD Order
```
1. Add items to cart
2. Go to checkout
3. Fill address form
4. Select "Cash on Delivery"
5. Click "Place COD Order"
   ✅ Should immediately show confirmation page
   ✅ Order status should be "placed"
   ✅ Payment status should be "pending"
```

#### 2. Card Payment Success
```
1. Add items to cart
2. Go to checkout
3. Fill address form
4. Select "Credit / Debit Card"
5. Click "Proceed to Payment"
   ✅ Should redirect to dummy payment page
6. Review order details
7. Leave "Simulate failure" unchecked
8. Click "Complete Payment"
   ✅ Should process payment (2 sec loading)
   ✅ Should navigate to confirmation
   ✅ Order status should be "paid"
   ✅ Payment status should be "completed"
```

#### 3. Card Payment Failure
```
1. Add items to cart (note initial stock)
2. Go to checkout
3. Fill address form
4. Select "Credit / Debit Card"
5. Click "Proceed to Payment"
6. Enable "Simulate payment failure"
7. Click "Complete Payment"
   ✅ Should fail after 2 sec
   ✅ Should show error message
   ✅ Order status should be "cancelled"
   ✅ Stock should be restored to original amount ← VERIFY IN DB
```

#### 4. Payment Timeout
```
1. Create order without completing payment
2. Go to database directly
3. Set order created_at to > 24 hours ago
4. Call cleanup function:
   SELECT cleanup_stale_orders();
   ✅ Should return (1, X) where X = item count
   ✅ Order status should be "cancelled"
   ✅ Stock should be restored
```

---

## 6. DATABASE VERIFICATION

### Check Order Status Flow

```sql
-- See all orders with their payment status
SELECT 
  o.id, 
  o.order_number,
  o.status,
  o.payment_status,
  p.status as payment_record_status,
  p.external_transaction_id,
  o.created_at
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
ORDER BY o.created_at DESC;
```

### Check Inventory Changes

```sql
-- See stock levels for a product
SELECT 
  pv.id,
  pv.sku,
  pv.stock_qty,
  pv.updated_at
FROM product_variants pv
WHERE pv.product_id = (SELECT id FROM products WHERE slug = 'boho-sunburst-handbag')
ORDER BY pv.updated_at DESC;

-- See order items (what was ordered)
SELECT 
  oi.id,
  oi.product_id,
  oi.quantity,
  oi.unit_price
FROM order_items oi
WHERE oi.order_id = '<order_id>';
```

### Check Order Status Events

```sql
-- See timeline of order changes
SELECT 
  id,
  order_id,
  status,
  notes,
  created_at
FROM order_status_events
WHERE order_id = '<order_id>'
ORDER BY created_at DESC;
```

---

## 7. PRODUCTION INTEGRATION GUIDE

### Switching from Dummy to Real Payment Gateway

When ready to integrate Razorpay/Stripe/PayU:

#### Step 1: Create Real Payment Session

**Replace** `src/lib/payment.ts` with actual gateway SDK:

```typescript
// Example: Razorpay
import Razorpay from 'razorpay';

export async function createRazorpayOrder(amount: number, orderId: string) {
  const razorpay = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.VITE_RAZORPAY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: orderId,
    notes: { order_id: orderId },
  });

  return {
    session_id: order.id,
    order_id: orderId,
  };
}
```

#### Step 2: Update Checkout Redirection

**Modify** `src/pages/Checkout.tsx`:

```typescript
// OLD (dummy):
const paymentUrl = generatePaymentPageUrl(sessionId, returnUrl);
window.location.href = paymentUrl;

// NEW (Razorpay):
const razorpaySession = await createRazorpayOrder(total, orderId);
window.location.href = `https://razorpay.com/${razorpaySession.id}`;
```

#### Step 3: Webhook Handler Remains the Same

The webhook handler `supabase/functions/payment-webhook/` works with any payment provider!

Just ensure the gateway sends:
```json
{
  "session_id": "gateway_order_id",
  "order_id": "our_order_id",
  "status": "completed|failed",
  "transaction_id": "gateway_transaction_id"
}
```

#### Step 4: Environment Variables

Add to `.env.local`:
```
VITE_RAZORPAY_KEY_ID=rzp_live_...
VITE_RAZORPAY_SECRET=... (Supabase Edge Function secret)
WEBHOOK_SIGNATURE_SECRET=... (For HMAC validation)
```

#### Step 5: Webhook Signature Validation

**Update** `src/lib/webhook.ts`:

```typescript
export function validateWebhookSignature(
  payload: unknown,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}
```

---

## 8. DEPLOYMENT CHECKLIST

- [ ] Test all payment flows locally
- [ ] Deploy database migration to Supabase
  ```bash
  supabase db push
  ```
- [ ] Deploy Edge Function
  ```bash
  supabase functions deploy payment-webhook
  ```
- [ ] Test webhook endpoint
  ```bash
  curl -X POST https://<project>.functions.supabase.co/functions/v1/payment-webhook \
    -H "Authorization: Bearer <anon_key>" \
    -H "Content-Type: application/json" \
    -d '{
      "session_id": "test",
      "order_id": "uuid",
      "status": "completed",
      "transaction_id": "txn_test"
    }'
  ```
- [ ] Setup cron job for cleanup (via Supabase dashboard)
- [ ] Verify RLS policies allow webhook function to update payments
- [ ] Test full end-to-end flow in staging
- [ ] Monitor error logs post-deployment

---

## 9. FILES CREATED/MODIFIED

### Created Files
- ✅ `src/lib/payment.ts` - Dummy payment service
- ✅ `src/pages/DummyPayment.tsx` - Payment page UI
- ✅ `src/lib/webhook.ts` - Webhook processing service
- ✅ `supabase/functions/payment-webhook/index.ts` - Edge Function
- ✅ `supabase/migrations/20260314120000_inventory_management_triggers.sql` - DB triggers

### Modified Files
- ✅ `src/pages/Checkout.tsx` - Payment flow integration
- ✅ `src/App.tsx` - Route addition

### Documentation
- ✅ This file: `DUMMY_PAYMENT_AND_INVENTORY_IMPLEMENTATION.md`

---

## 10. SUMMARY

| Component | Status | Next Steps |
|-----------|--------|-----------|
| Dummy Payment Service | ✅ Complete | Test locally |
| Dummy Payment Page | ✅ Complete | Test in browser |
| Checkout Integration | ✅ Complete | Run checkout flow |
| Inventory Restoration | ✅ Complete | Verify in database |
| Order Timeout Cleanup | ✅ Complete | Schedule cron job |
| Webhook Handler | ✅ Complete | Deploy Edge Function |
| COD Orders | ✅ Complete | Test end-to-end |
| Card/UPI Orders | ✅ Complete (Mock) | Ready for real gateway |
| Payment Tracking | ✅ Complete | Monitor in production |

**Status Summary**: All dummy payment and inventory management features are implemented and ready for testing. The architecture supports seamless transition to real payment gateways.

