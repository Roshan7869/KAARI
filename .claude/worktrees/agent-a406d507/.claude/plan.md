# Cashfree Payment Integration & UI/UX Enhancement Plan

## Executive Summary

Complete the Cashfree payment integration for Kaari Marketplace, transitioning from the current dummy payment flow to a production-ready UPI payment system, along with UI/UX enhancements.

---

## Current State Analysis

### Already Implemented ✅
1. **Cashfree Library** (`src/lib/cashfree.ts`)
   - Order creation, session management
   - Webhook signature verification (HMAC-SHA256)
   - Test/production mode switching
   - UPI-only payment method enforcement

2. **Dummy Payment System** (`src/lib/payment.ts`)
   - Session-based payment simulation
   - Used for development/testing

3. **Payment Webhook** (`supabase/functions/payment-webhook/index.ts`)
   - Signature validation for Cashfree webhooks
   - Dummy session verification
   - Order status updates on payment completion/failure
   - Idempotency checks

4. **Cashfree Edge Function** (`supabase/functions/cashfree-payment/index.ts`)
   - Server-side order creation
   - User authentication verification
   - Amount validation against order total

5. **Database Schema**
   - `payment_gateways` - Gateway configuration (api_key, api_secret, webhook_secret)
   - `cashfree_sessions` - Payment session tracking
   - `payments` - Payment records
   - `notifications` - Notification queue

6. **UI Components**
   - Checkout page with payment method selection
   - DummyPayment page for simulated payments
   - OrderConfirmation page

### Gaps to Address ❌

1. **Checkout Integration**: Currently uses dummy payment - needs to integrate Cashfree
2. **Cashfree SDK Drop-in**: Missing Cashfree SDK JavaScript integration
3. **Payment Gateway Admin UI**: No admin interface to configure Cashfree credentials
4. **Order Confirmation Enhancement**: Missing order items, shipping details
5. **Payment Status Polling**: No fallback for webhook failures
6. **UPI Deep Linking**: Missing UPI app redirect support

---

## Implementation Plan

### Phase 1: Cashfree SDK Integration (Priority: HIGH)

#### 1.1 Add Cashfree SDK to Frontend
**File**: `src/lib/cashfree-sdk.ts` (new)

```typescript
// Initialize Cashfree Drop/Checkout components
// Handle UPI app redirects (GPay, PhonePe, Paytm, etc.)
// Manage payment status polling
```

**Tasks**:
- [ ] Create Cashfree SDK initialization utility
- [ ] Implement UPI app detection and deep linking
- [ ] Add payment status polling with exponential backoff
- [ ] Handle payment failures with retry logic

#### 1.2 Update Checkout Flow
**File**: `src/pages/Checkout.tsx`

**Changes**:
- Replace `generateDummyPaymentSession()` with `createCashfreeOrder()` for non-COD
- Add Cashfree SDK script loading
- Implement Cashfree Drop/Checkout modal
- Handle payment callback/redirect

#### 1.3 Create Payment Processing Page
**File**: `src/pages/Payment.tsx` (new)

**Features**:
- Cashfree SDK initialization
- UPI payment flow with app selection
- Card/NetBanking fallback UI
- Real-time payment status polling
- Success/failure redirects

---

### Phase 2: Admin Payment Gateway Configuration (Priority: HIGH)

#### 2.1 Create Admin Payment Settings
**File**: `src/pages/admin/AdminPaymentSettings.tsx` (new)

**Features**:
- Configure Cashfree credentials (API Key, Secret, Webhook Secret)
- Toggle test/production mode
- View recent transactions
- Test gateway connection
- View payment logs

#### 2.2 Database Seed for Payment Gateway
**File**: `supabase/migrations/seed_payment_gateway.sql` (new)

```sql
-- Insert default Cashfree configuration (inactive)
INSERT INTO payment_gateways (provider, is_active, is_test_mode, config)
VALUES ('cashfree', false, true, '{"upi_only": true}');
```

---

### Phase 3: Order Confirmation Enhancement (Priority: MEDIUM)

#### 3.1 Enhanced Order Confirmation Page
**File**: `src/pages/OrderConfirmation.tsx`

**Add**:
- Order items list with images, quantities, prices
- Shipping address display
- Payment method details
- Estimated delivery date
- Track order button (links to order history)
- Download invoice button

---

### Phase 4: Payment Status Management (Priority: MEDIUM)

#### 4.1 Payment Status Polling Hook
**File**: `src/hooks/usePaymentStatus.ts` (new)

**Features**:
- Poll payment status every 3-5 seconds
- Exponential backoff on errors
- Timeout after 15 minutes
- Real-time status updates

#### 4.2 Webhook Retry Mechanism
**File**: `supabase/functions/payment-webhook/index.ts`

**Enhancements**:
- Queue failed webhooks for retry
- Implement idempotency with transaction ID
- Log all webhook attempts

---

### Phase 5: Security Hardening (Priority: HIGH)

#### 5.1 Environment Configuration
**File**: `supabase/functions/cashfree-payment/index.ts`

**Tasks**:
- [ ] Ensure CASHFREE_APP_ID and CASHFREE_SECRET_KEY are read from Supabase secrets
- [ ] Add webhook secret validation
- [ ] Implement rate limiting for order creation

#### 5.2 Client-Side Security
**File**: `src/pages/Checkout.tsx`

**Tasks**:
- [ ] Verify amount on payment page matches cart total
- [ ] Validate order ownership before redirect
- [ ] Clear sensitive data after payment

---

### Phase 6: Error Handling & UX (Priority: MEDIUM)

#### 6.1 Payment Error Pages
**Files**:
- `src/pages/PaymentFailed.tsx` (new)
- `src/pages/PaymentExpired.tsx` (new)

**Features**:
- Clear error messages
- Retry payment option
- Contact support link
- Order status summary

#### 6.2 Payment Loading States
**File**: `src/components/PaymentLoading.tsx` (new)

**Features**:
- Animated loading indicator
- "Processing payment" messaging
- Timeout handling

---

## Technical Implementation Details

### Cashfree SDK Integration Pattern

```typescript
// src/lib/cashfree-sdk.ts
export async function initializeCashfreePayment(session: CashfreePaymentSession): Promise<void> {
  // Load Cashfree SDK dynamically
  const script = document.createElement('script');
  script.src = 'https://sdk.cashfree.com/js/v3/cashfree-sdk.js';
  script.async = true;

  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // Initialize Cashfree instance
  const cashfree = CashfreeSDK.init({
    paymentSessionId: session.payment_session_id,
    mode: 'PRODUCTION' // or 'SANDBOX'
  });

  // Open payment modal
  cashfree.open();
}
```

### Checkout Flow Update

```
User selects UPI/Card → Checkout validates cart →
  └─ COD → Create order → Order confirmation
  └─ UPI/Card → Create order → Cashfree order creation →
      └─ Redirect to Cashfree SDK → User pays →
          └─ Success → Webhook → Order status: paid
          └─ Failure → Webhook → Order status: cancelled → Restore inventory
```

---

## Database Changes Required

### New Tables: None (schema exists)

### Migration: Seed default gateway

```sql
-- supabase/migrations/seed_payment_gateway.sql
INSERT INTO payment_gateways (provider, is_active, is_test_mode, config)
VALUES ('cashfree', false, true, '{"upi_only": true}')
ON CONFLICT (provider) WHERE is_active = true DO NOTHING;
```

---

## Environment Variables Required

```env
# Supabase Edge Functions
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret

# Supabase Client (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

---

## Testing Checklist

- [ ] Cashfree test mode payment flow
- [ ] Cashfree production mode payment flow
- [ ] UPI app deep linking (GPay, PhonePe, Paytm)
- [ ] Card payment flow
- [ ] NetBanking payment flow
- [ ] Payment failure handling
- [ ] Payment timeout handling
- [ ] Webhook signature verification
- [ ] Duplicate payment prevention
- [ ] Inventory restoration on payment failure
- [ ] Order status updates
- [ ] Email/SMS notifications

---

## Rollout Plan

1. **Stage 1**: Deploy to development environment
   - Configure Cashfree sandbox credentials
   - Test UPI flow in test mode
   - Verify webhook handling

2. **Stage 2**: User acceptance testing
   - Test with real UPI apps in sandbox
   - Verify order confirmation emails
   - Check inventory management

3. **Stage 3**: Production deployment
   - Switch to production credentials
   - Enable webhook endpoint
   - Monitor first transactions

---

## Files to Create/Modify

### New Files
- `src/lib/cashfree-sdk.ts` - Cashfree SDK wrapper
- `src/pages/Payment.tsx` - Payment processing page
- `src/pages/PaymentFailed.tsx` - Payment failure page
- `src/pages/admin/AdminPaymentSettings.tsx` - Gateway config
- `src/hooks/usePaymentStatus.ts` - Payment polling hook
- `src/components/PaymentLoading.tsx` - Loading component
- `supabase/migrations/seed_payment_gateway.sql` - Seed data

### Modified Files
- `src/pages/Checkout.tsx` - Integrate Cashfree
- `src/pages/OrderConfirmation.tsx` - Enhanced display
- `src/App.tsx` - Add new routes
- `src/lib/cashfree.ts` - Add SDK integration helpers

---

## Success Criteria

1. ✅ Non-COD payments route through Cashfree
2. ✅ UPI payments work with deep linking
3. ✅ Payment failures restore inventory
4. ✅ Order status updates correctly
5. ✅ Admin can configure gateway
6. ✅ Webhook validates signatures
7. ✅ All tests pass with 80%+ coverage