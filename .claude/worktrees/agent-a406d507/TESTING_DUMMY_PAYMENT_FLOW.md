# Quick Start: Testing Dummy Payment Flow

## Prerequisites
- Application is running locally (`npm run dev`)
- Database migrations have been applied
- Supabase Edge Function is deployed (or you can skip webhook testing for now)

---

## Test 1: Cash on Delivery (COD) ✅ WORKS IMMEDIATELY

**Expected**: Order should be placed immediately without payment processing.

```
1. Open http://localhost:5173/products
2. Add any item to cart
3. Click cart icon → "Proceed to Checkout"
4. Fill in all form fields:
   - Email: test@example.com
   - Phone: 9999999999
   - Name: Test User
   - Address: Any address
   - City: Mumbai
   - State: MH
   - PIN: 400001
5. Select "Cash on Delivery" payment method
6. Click "Place COD Order"

✅ EXPECTED RESULT:
   - Toast: "Order placed successfully!"
   - Navigate to /order-confirmation/:orderId
   - Order status: "placed"
   - Payment status: "pending"
   - Cart cleared
```

---

## Test 2: Card Payment - Success ✅ WORKS WITH MOCK

**Expected**: Redirect to dummy payment page, process payment, show confirmation.

```
1. Add item to cart
2. Go to checkout
3. Fill all form fields (same as Test 1)
4. Select "Credit / Debit Card"
5. Click "Proceed to Payment"

✅ STEP 1 RESULT:
   - Toast: "Redirecting to payment gateway..."
   - Navigate to http://localhost:5173/dummy-payment?session_id=...

6. On dummy payment page:
   - Leave "Simulate payment failure" UNCHECKED ← Important!
   - Review order details
   - Click "Complete Payment"

✅ STEP 2 RESULT:
   - Loading spinner for 2 seconds
   - Webhook processes payment
   - Toast: "Payment successful!"
   - Navigate to confirmation page
   - Order status: "paid"
   - Payment status: "completed"
```

---

## Test 3: Card Payment - Failure ✅ TESTS INVENTORY RESTORATION

**Expected**: Payment fails, order cancelled, inventory restored.

```
BEFORE TEST:
   Note the current stock for a product in database:
   
   SELECT stock_qty FROM product_variants 
   WHERE sku = 'SKU-BOHO_SUNBURST_HANDBAG-DEFAULT';
   
   Example: stock_qty = 20

1. Add that product to cart (quantity: 1)
2. Go to checkout, fill form
3. Select any payment method except COD
4. Click "Proceed to Payment"
5. On dummy payment page:
   - ENABLE checkbox: "Simulate payment failure" ← Key!
   - Click "Complete Payment"

✅ RESULT:
   - Loading spinner for 2 seconds
   - Toast: "Payment failed. Your order has been cancelled and inventory restored."
   - Error shown: "Payment failed. Please try again."
   - After 3 seconds, redirects to /checkout

VERIFY INVENTORY RESTORATION:
   
   SELECT stock_qty FROM product_variants 
   WHERE sku = 'SKU-BOHO_SUNBURST_HANDBAG-DEFAULT';
   
   ✅ Should be back to 20 (not 19!)
   
   ALSO CHECK:
   SELECT status FROM orders WHERE id = '<order_id>';
   ✅ Should be: cancelled
   
   SELECT status FROM payments WHERE order_id = '<order_id>';
   ✅ Should be: failed
```

---

## Test 4: Payment Timeout Cleanup 🔄 MANUAL TEST

**Expected**: Orders pending >24 hours auto-cancel and restore inventory.

```
1. Create an order with card payment (complete BEFORE webhook)
2. Go to database directly
3. Update the order's created_at to >24 hours ago:
   
   UPDATE orders 
   SET created_at = now() - INTERVAL '25 hours'
   WHERE id = '<order_id>' 
   AND status = 'payment_pending';

4. Check current stock before cleanup:
   
   SELECT stock_qty FROM product_variants 
   WHERE id IN (
     SELECT variant_id FROM order_items 
     WHERE order_id = '<order_id>'
   );
   
   Note the current stock (should be reduced)

5. Run cleanup function:
   
   SELECT cleanup_stale_orders();
   
   ✅ Should return: (1, x) where x = items in order

6. Verify inventory restored:
   
   SELECT stock_qty FROM product_variants 
   WHERE id IN (
     SELECT variant_id FROM order_items 
     WHERE order_id = '<order_id>'
   );
   
   ✅ Should be back to original value

7. Check order status:
   
   SELECT status FROM orders WHERE id = '<order_id>';
   ✅ Should be: cancelled
```

---

## Test 5: Duplicate Webhook Call (Idempotency) 🔄 ADVANCED

**Expected**: Calling webhook twice with same data should only update once.

```
1. Manually create an order via database (or through UI)
2. Call webhook twice with same data:

   FIRST CALL:
   curl -X POST http://localhost:3000/functions/v1/payment-webhook \
     -H "Authorization: Bearer <anon_key>" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "test_123",
       "order_id": "<order_id>",
       "status": "completed",
       "transaction_id": "txn_1234567890"
     }'
   
   ✅ Response: { success: true, ... }
   
   SECOND CALL (same data):
   [Run same curl command again]
   
   ✅ Response: { 
     success: true, 
     message: "Payment already processed",
     ...
   }

3. Check database:
   
   SELECT status FROM payments WHERE order_id = '<order_id>';
   ✅ Should be: completed
   
   COUNT order_status_events:
   SELECT COUNT(*) FROM order_status_events WHERE order_id = '<order_id>';
   ✅ Should have same count as before (not doubled!)
```

---

## Test 6: Session Expiration 🔄 EDGE CASE

**Expected**: Payment sessions expire after 15 minutes.

```
1. Generate payment session manually via JavaScript console:
   
   Note: This requires payment service to be exposed (dev mode)
   
2. Wait 15+ minutes
3. Try to use the session:
   - Copy the session ID
   - Go to http://localhost:5173/dummy-payment?session_id=<old_session_id>
   
   ✅ Should show: "Payment session expired or not found"
```

---

## Debugging Checklist

### Payment doesn't redirect
- [ ] Check browser console for errors
- [ ] Verify session is created: `getDummyPaymentSession()` in console
- [ ] Check if redirecting to correct URL: `/dummy-payment?session_id=...`

### Dummy payment page shows error
- [ ] Check console for `session_id` query parameter
- [ ] Verify payment session exists in `SESSION_STORAGE`
- [ ] Check if page load timing is correct

### Webhook not updating database
- [ ] Verify Edge Function is deployed
- [ ] Check Supabase logs: Dashboard → Functions → payment-webhook
- [ ] Verify RLS policies allow function to update tables
- [ ] Check if webhook secret is set correctly (if implemented)

### Inventory not restoring
- [ ] Verify trigger created successfully
- [ ] Check database logs for trigger errors
- [ ] Ensure payment status is being updated before trigger fires
- [ ] Verify product_variants table has stock_qty column

### Order status not updating
- [ ] Check if order record exists
- [ ] Verify order has matching payment record
- [ ] Check Edge Function logs for errors
- [ ] Verify auth.uid() matches order.user_id

---

## Database Queries for Testing

### View all orders and their payment status
```sql
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.payment_status,
  p.status as payment_status_db,
  p.external_transaction_id,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 10;
```

### View order items and current stock
```sql
SELECT 
  oi.id as order_item_id,
  p.title,
  pv.sku,
  pv.stock_qty as current_stock,
  oi.quantity as ordered_qty,
  (pv.stock_qty + oi.quantity) as stock_before_order
FROM order_items oi
JOIN product_variants pv ON pv.id = oi.variant_id
JOIN products p ON p.id = pv.product_id
WHERE oi.order_id = '<order_id>';
```

### View order status timeline
```sql
SELECT 
  status,
  notes,
  created_at
FROM order_status_events
WHERE order_id = '<order_id>'
ORDER BY created_at DESC;
```

### View all payment-related orders
```sql
SELECT 
  o.id,
  o.status,
  p.status as payment_status,
  p.external_transaction_id,
  EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 as hours_old
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.payment_status IS NOT NULL
ORDER BY o.created_at DESC;
```

---

## Success Criteria ✅

All tests pass when:

| Test | Status | Evidence |
|------|--------|----------|
| COD Order | ✅ | Order confirmed immediately |
| Card Success | ✅ | Redirects to confirmation, status=paid |
| Card Failure | ✅ | Order cancelled, inventory restored |
| Timeout Cleanup | ✅ | Stale orders auto-cancel, DB verified |
| Idempotency | ✅ | Duplicate webhooks handled gracefully |
| Session Expiry | ✅ | Expired sessions rejected |

---

## Next Steps

1. **Run all tests above** ← You are here
2. **Deploy to Supabase** when confident
3. **Setup cron job** for timeout cleanup
4. **Integrate real payment gateway** (Razorpay/Stripe/PayU)
5. **Replace dummy payment** with production gateway
6. **Setup webhook signature validation** for security
7. **Monitor logs** post-launch

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Check Supabase migrations status
supabase status

# Deploy Edge Function
supabase functions deploy payment-webhook

# View Edge Function logs
supabase functions logs payment-webhook

# Connect to Supabase database locally
supabase db push
```

