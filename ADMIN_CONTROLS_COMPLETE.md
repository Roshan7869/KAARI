# 🔐 ADMIN CONTROLS & FEATURES - Complete Inventory

**Last Updated**: April 10, 2026  
**Total Admin Features**: 10 major sections  
**Total API Endpoints**: 15 routes  
**Status**: ✅ **FULLY OPERATIONAL**

---

## 📋 ADMIN ACCESS ROUTING

### Authorization
- **Entry Point**: `/admin` (redirects non-admin to home)
- **Auth Method**: Clerk authentication + role check
- **Role Check**: `publicMetadata.role === 'admin'` in Clerk
- **Middleware Protection**: [middleware.ts](middleware.ts) — blocks all `/admin/*` routes for non-admins
- **Fallback**: Supabase `has_role('admin', auth.uid())` for server-side operations

### Admin Sidebar Navigation
**File**: [app/admin/layout.tsx](app/admin/layout.tsx#L33)

```
Dashboard → /admin
Products → /admin/products
Media Library → /admin/media
Orders → /admin/orders
Customers → /admin/customers
Reviews → /admin/reviews
Coupons → /admin/coupons
Billboard → /admin/billboard
Settings → /admin/settings
```

---

## 🏠 1. DASHBOARD

**Route**: `/admin`  
**File**: [app/admin/page.tsx](app/admin/page.tsx#L22) + [components/pages/admin/AdminDashboard.tsx](components/pages/admin/AdminDashboard.tsx)

### What Admins See
- 📊 **Key Metrics Cards**
  - Total orders (all-time)
  - Total revenue (all-time, ₹ formatted)
  - Total customers
  - Pending orders count
  - Today's revenue
  - Today's orders

- 📈 **Analytics Charts**
  - Revenue by period (selectable: Day/Week/Month/Year)
  - Order count by period
  - Order status breakdown (pie chart: pending, paid, processing, shipped, delivered, cancelled)

- 📋 **Recent Orders Table**
  - Last 10 orders
  - Order ID → link to detail page
  - Customer name & email
  - Total amount (₹)
  - Order status
  - Quick action: View full details

### Data Source
**API**: GET [/api/admin/stats](app/api/admin/stats/route.ts#L11)

Query params:
- `endpoint=orders|customers|revenue` — what data to fetch
- `period=day|week|month|year` — aggregation period
- `page=1` — pagination for large result sets
- `limit=10` — items per page

---

## 📦 2. PRODUCTS MANAGEMENT

### 2.1 Products List
**Route**: `/admin/products`  
**File**: [app/admin/products/page.tsx](app/admin/products/page.tsx) | [components/pages/admin/AdminProducts.tsx](components/pages/admin/AdminProducts.tsx#L23)

#### Features Available
| Action | Capability | How to Use |
|--------|-----------|-----------|
| **View Products** | List all products paginated (10 per page) | Automatic on page load |
| **Search** | Find products by title (case-insensitive) | Type in search box, auto-filters |
| **Filter** | Toggle active/inactive status | Filter dropdown |
| **Sort** | By creation date (newest first) | Automatic |
| **View Details** | Product ID, title, slug, price, category, status | Row displays inline |
| **Edit** | Click product row → `/admin/products/[id]` | Click on any product |
| **Create New** | Add new product → `/admin/products/new` | "New Product" button |
| **Delete** | Remove product + cascading deletes (media, variants) | Trash icon per row |

#### Product Fields Editable
```
Name (title) — required
Description — rich text/editor
Base Price (₹) — required
Category — dropdown (handmade, crochet, etc.)
Active Status — toggle on/off
Media — upload images
```

#### API Endpoints
- **GET** [/api/admin/products](app/api/admin/products/route.ts#L48) — List (supports pagination, search)
- **POST** [/api/admin/products](app/api/admin/products/route.ts#L99) — Create new
- **PUT** [/api/admin/products](app/api/admin/products/route.ts#L156) — Update existing
- **DELETE** [/api/admin/products](app/api/admin/products/route.ts#L237) — Delete

### 2.2 Create Product
**Route**: `/admin/products/new`  
**File**: [app/admin/products/new/page.tsx](app/admin/products/new/page.tsx#L3) | [components/pages/admin/AdminProductForm.tsx](components/pages/admin/AdminProductForm.tsx)

#### Form Fields
- Title (text) — *required
- Description (textarea) — *required
- Base Price ₹ (number) — *required
- Category (select) — *required
- Active (toggle) — default: true
- Media upload section

#### Validation
- Uses Zod schema: `AdminProductCreateSchema`
- All required fields must be filled
- Price must be > 0
- Title must be unique (slug generation)

#### On Save
- Product created in `products` table
- Gets auto-generated slug
- Redirects to edit page: `/admin/products/[id]`

### 2.3 Edit Product
**Route**: `/admin/products/[id]`  
**File**: [app/admin/products/[id]/page.tsx](app/admin/products/%5Bid%5D/page.tsx#L3)

#### Capabilities
- Same form as Create
- Pre-fills with existing product data
- Can update all editable fields
- Can add/remove/reorder media
- Shows product ID (read-only)

### 2.4 Delete Product
**Trigger**: Trash icon in product list  
**Cascading Deletes**:
- ✅ `product_media` — all product images
- ✅ `product_variants` — all SKU variants
- ✅ Associated `cart_items` — removes from active carts
- ✅ `reviews` — product reviews

---

## 📋 3. ORDERS MANAGEMENT

### 3.1 Orders List
**Route**: `/admin/orders`  
**File**: [app/admin/orders/page.tsx](app/admin/orders/page.tsx) | [components/pages/admin/AdminOrders.tsx](components/pages/admin/AdminOrders.tsx)

#### View Capabilities
| Feature | Details |
|---------|---------|
| **List View** | All orders paginated (20 per page by default) |
| **Search** | Find by order ID or customer (email/name) |
| **Filter by Status** | pending, paid, processing, shipped, delivered, cancelled |
| **Filter by Date Range** | Select start/end date |
| **Display Columns** | Order ID, Customer, Amount (₹), Status, Date |
| **Sort Options** | By date (newest), by status, by amount |
| **Quick Action** | Click order → `/admin/orders/[id]` detail page |
| **Skeleton Loading** | Shows while fetching |

#### Data Sources
- **Orders Table**: order ID, total_amount, status, created_at
- **Checkout Sessions**: payment method, shipping address
- **Profiles**: customer name, email

### 3.2 Order Detail
**Route**: `/admin/orders/[id]`  
**File**: [app/admin/orders/[id]/page.tsx](app/admin/orders/%5Bid%5D/page.tsx#L3) | [components/pages/admin/AdminOrderDetail.tsx](components/pages/admin/AdminOrderDetail.tsx)

#### Full Order View
**Section 1: Order Summary**
```
Order ID: ORD-XXXX-YYYY-ZZZZ
Status: [pending | paid | processing | shipped | delivered | cancelled]
Total Amount: ₹XXXX
Created: April 10, 2026 2:15 PM
```

**Section 2: Customer Information**
```
Name: [Customer Name]
Email: [customer@email.com]
Phone: [Phone Number]
User ID (Clerk): [UUID]
```

**Section 3: Shipping Address**
```
Street: [Address]
City: [City]
State: [State]
Postal Code: [PIN]
Country: India
```

**Section 4: Order Items**
```
| Product | Quantity | Unit Price | Total | Notes |
|---------|----------|-----------|-------|-------|
| [Product Name] | [Qty] | ₹[Price] | ₹[Total] | [Custom details if any] |
```

**Section 5: Payment Details**
```
Payment Method: [UPI | Card | Net Banking]
Payment Status: [pending | success | failed]
Transaction ID: [Cashfree ID]
Payment Date: [Date/Time]
Gateway: Cashfree
```

**Section 6: Timeline/Status History** ⭐
```
✓ Order Created — April 10 2:15 PM
✓ Payment Received — April 10 2:18 PM (UPI)
⏳ Processing — April 10 3:00 PM
→ Shipping — [Awaiting]
→ Delivered — [Awaiting]
```

### 3.3 Update Order Tracking
**Location**: Order detail page tracking section  
**File**: [app/api/admin/orders/[id]/tracking/route.ts](app/api/admin/orders/%5Bid%5D/tracking/route.ts#L15)

#### Editable Fields
- **Tracking Number** — e.g., "9876543210"
- **Tracking URL** — e.g., "https://track.courier.com/..."
- **Shipping Carrier** — e.g., "DHL", "FedEx", "India Post", "Delhivery"
- **Estimated Delivery** — Date picker
- **Current Status** — Dropdown selector:
  - processing
  - shipped
  - out_for_delivery
  - delivered
  - courier_lost
  - returned

#### On Update
- Update stored in `orders` table tracking columns
- Creates `order_status_events` record
- Automatically sends tracking email to customer (via Resend)
- Timeline/audit log updated

---

## 👥 4. CUSTOMERS MANAGEMENT

**Route**: `/admin/customers`  
**File**: [app/admin/customers/page.tsx](app/admin/customers/page.tsx#L16) | [components/pages/admin/AdminCustomers.tsx](components/pages/admin/AdminCustomers.tsx#L19)

### View Capabilities
| Feature | Action |
|---------|--------|
| **List All Customers** | Paginated (20 per page) |
| **Customer Info** | ID, Name, Email, Phone, Region |
| **Metrics** | Total Orders, Total Spend (₹), Last Order Date |
| **Search** | By name or email |
| **Filter** | By loyalty status, region, registration date |
| **Sort** | By name, total spend, registration date |
| **View Profile** | Click customer → shows detailed profile |
| **Order History** | See all customer's orders (linked) |

### Customer Profile Includes
```
Customer ID (Clerk): UUID
Name: Full name
Email: [email@domain.com]
Phone: [Phone]
Created: Registration date + time
Total Orders: Count
Total Spend: ₹XXXX
Addresses: Saved shipping addresses
Wishlist: Saved items (if feature used)
```

### ⚠️ Limitations
- ❌ **No Direct Edit** — Cannot modify customer name, email in admin panel
- ❌ **No Direct Delete** — Cannot delete customer account (must use Clerk dashboard)
- ✅ **Archive** — Can soft-delete via account settings

---

## ⭐ 5. REVIEWS MANAGEMENT

**Route**: `/admin/reviews`  
**Files**: [app/admin/reviews/page.tsx](app/admin/reviews/page.tsx#L20) | [components/admin/AdminReviewList.tsx](components/admin/AdminReviewList.tsx) | [components/admin/AdminReviewFilters.tsx](components/admin/AdminReviewFilters.tsx) | [components/admin/AdminReviewAuditLog.tsx](components/admin/AdminReviewAuditLog.tsx)

### 5.1 Review Moderation Queue

#### View Options
| Feature | Details |
|---------|---------|
| **Pending Reviews** | Waiting for admin approval |
| **Approved Reviews** | Published on product pages |
| **Rejected Reviews** | Hidden (admin can view reason) |
| **Featured Reviews** | Highlighted on product page |

#### Review Display
```
Customer: [Name] (anonymizable)
Product: [Product Name]
Rating: ⭐⭐⭐⭐⭐ (1-5 stars)
Review Text: [Full text, searchable]
Date: Posted date
Status: [pending | approved | rejected]
```

#### Search & Filter
- **Search by**: Product name, customer name, review text
- **Filter by Status**: pending, approved, rejected, featured
- **Filter by Rating**: 1-star through 5-star
- **Filter by Date**: Last week, last month, all time
- **Bulk Select**: Check multiple reviews for batch actions

### 5.2 Review Actions

#### Per-Review Actions
| Action | What Happens |
|--------|-------------|
| **Approve** | Sets status=`approved`, shows on product page, sends confirmation to customer |
| **Reject** | Hides review, customer gets notification with optional reason |
| **Feature** | Adds `featured=true`, appears at top of product reviews |
| **Unfeatured** | Removes featured status |
| **Hide** | Sets `is_visible=false` (soft delete, recoverable) |
| **Delete** | Permanently removes from system |

#### Bulk Actions
- [ ] Select multiple reviews
- [ ] Approve all
- [ ] Reject all (with reason)
- [ ] Feature all

### 5.3 Audit & Compliance
**Table**: `review_audit_log`

Each review action creates log entry:
```
Who: Admin name/ID
Action: "approved" | "rejected" | "featured" | "deleted"
When: Timestamp
Reason: Optional admin note
Original Status: Previous state
```

View **Audit Log** link to see all actions on specific review

#### API Endpoints
- **PATCH** [/api/admin/reviews/[id]](app/api/admin/reviews/%5Bid%5D/route.ts#L22) — Update status/featured/visible
- **DELETE** [/api/admin/reviews/[id]](app/api/admin/reviews/%5Bid%5D/route.ts#L107) — Delete review

---

## 🖼️ 6. MEDIA LIBRARY

**Route**: `/admin/media`  
**File**: [app/admin/media/page.tsx](app/admin/media/page.tsx#L35) | [components/pages/admin/CloudinaryMediaLibrary.tsx](components/pages/admin/CloudinaryMediaLibrary.tsx)

### Upload & Management
| Action | How To |
|--------|--------|
| **Upload Images** | Click "Upload Media" → Cloudinary widget → Select files |
| **Bulk Upload** | Upload multiple images at once (drag & drop) |
| **Supported Formats** | JPG, PNG, WebP, GIF |
| **Max Size** | 10MB per image (Cloudinary limit) |

### Media Library View
```
Grid View (or List View):
┌─────────────────────────────────────────────────────────┐
│ [Image] [Image] [Image] [Image] [Image] [Image]        │
│ Product Name  × Hover for controls (delete, set primary) │
│ Size: 250KB  │  Dimensions: 1200×800px  │  Date: Apr 10 │
└─────────────────────────────────────────────────────────┘
```

### Per-Image Controls
- **Set as Primary** — Use as product cover image
- **Reorder** — Drag or up/down buttons (sort_order field)
- **View Metadata** — Filename, size, dimensions, upload date
- **Delete from Kaari** — Removes from `product_media` table (keeps in Cloudinary)
- **Delete from Cloudinary** — Removes from CDN entirely
- **Download** — Get full-resolution file

### Image Optimization
All images served with Cloudinary parameters:
```
?f_auto,q_auto — auto format & quality
?w_NNNN,h_NNNN — responsive sizes
?c_fill,g_auto — smart cropping
```

#### API Endpoints
- **GET** [/api/admin/media](app/api/admin/media/route.ts#L10) — List media resources
- **DELETE** [/api/admin/media/delete](app/api/admin/media/delete/route.ts#L17) — Remove from product_media
- **DELETE** [/api/admin/media/delete-asset](app/api/admin/media/delete-asset/route.ts#L15) — Delete from Cloudinary

---

## 🎟️ 7. COUPONS MANAGEMENT

**Route**: `/admin/coupons`  
**File**: [app/admin/coupons/page.tsx](app/admin/coupons/page.tsx#L11) | [components/pages/admin/AdminCoupons.tsx](components/pages/admin/AdminCoupons.tsx#L40)

### Create Coupon
**Button**: "New Coupon" → Modal/Form

#### Form Fields
```
Code: SUMMER2024 (required, unique)
Type: Fixed (₹) | Percentage (%)
Amount: Enter discount value
  - If Fixed: ₹100
  - If Percent: 20 (means 20%)
Max Uses: 100 (0 = unlimited)
Expiry Date: April 30, 2026
Active: Toggle on/off
Min Cart Value: ₹500 (optional)
Max Discount: ₹1000 (optional)
```

### Coupon List
**Display Table**:
```
| Code | Type | Amount | Max Uses | Used | Expires | Status | Actions |
|------|------|--------|----------|------|---------|--------|---------|
| SUMMER2024 | % | 20 | 100 | 45 | Apr 30 | Active | Edit × |
```

### Coupon Actions
| Action | Effect |
|--------|--------|
| **Edit** | Modify amount, max uses, expiry (code locked) |
| **Activate/Deactivate** | Toggle `is_active` flag |
| **View Usage** | See which customers used this coupon |
| **Delete** | Remove coupon permanently |
| **Duplicate** | Create copy with new code |

### Coupon Logic (Backend)
- Coupons validated at checkout
- Duplicate-use prevention per customer per coupon (can configure)
- Auto-disable after expiry_date
- Max uses enforced (used_count tracked)
- Discount applied to order total

#### API Endpoints
- **GET** [/api/admin/coupons](app/api/admin/coupons/route.ts#L10) — List all
- **POST** [/api/admin/coupons](app/api/admin/coupons/route.ts#L30) — Create new
- **PATCH** [/api/admin/coupons/[id]](app/api/admin/coupons/%5Bid%5D/route.ts#L17) — Update status
- **DELETE** [/api/admin/coupons/[id]](app/api/admin/coupons/%5Bid%5D/route.ts#L43) — Delete

---

## 🎪 8. BILLBOARD (Homepage Hero Carousel)

**Route**: `/admin/billboard`  
**File**: [app/admin/billboard/page.tsx](app/admin/billboard/page.tsx#L80)

### What is Billboard?
Featured products carousel on homepage. Up to 6 products displayed as slides.

### Manage Billboard

**Search & Add Products**:
1. Search input → type product name
2. Results dropdown → click product to add
3. Appears in sortable list below

**Billboard Slide Management**:
```
[1] [Product Image] Product Name ★ NEW ARRIVAL ↑ ↓ ✕
    Price: ₹999
    
[2] [Product Image] Product Name ± BESTSELLER ↑ ↓ ✕
    Price: ₹1,299

[3] [Product Image] Product Name ± SALE      ↑ ↓ ✕
    Price: ₹599
```

### Per-Slide Controls
| Control | Action |
|---------|--------|
| **↑ ↓ Buttons** | Reorder slides (changes `display_order`) |
| **Badge Dropdown** | Add label: NEW ARRIVAL, BESTSELLER, SALE, EXCLUSIVE, LIMITED |
| **Remove (✕)** | Delete slide from billboard |
| **Toggle (±)** | Show/hide without removing (sets is_active) |
| **Image** | Product thumbnail (auto-loaded) |

### Save Changes
- Click "Save Billboard" button
- All changes persisted to `billboard_products` table
- Front-end ISR revalidates (60 second cache)
- Live on homepage in ~60 seconds

### Data Stored
```
billboard_products (
  product_id,
  display_order,     -- Sort order (1, 2, 3...)
  tag,               -- "NEW_ARRIVAL", "BESTSELLER", etc.
  is_active          -- true/false to show/hide
)
```

#### API Endpoints
- **GET** [/api/admin/billboard](app/api/admin/billboard/route.ts#L6) — Current billboard state
- **PUT** [/api/admin/billboard](app/api/admin/billboard/route.ts#L39) — Save new ordering

---

## ⚙️ 9. SETTINGS

### 9.1 General Store Settings
**Route**: `/admin/settings`  
**File**: [app/admin/settings/page.tsx](app/admin/settings/page.tsx#L16) | [components/pages/admin/AdminSettings.tsx](components/pages/admin/AdminSettings.tsx)

#### Editable Settings
```
Store Name: "Kaari Marketplace"
Store Email: contact@kaari.com
Store Phone: +91-XXXXXXXXXX
Store Address: [Full address]
Support Email: support@kaari.com
Currency: INR (₹) [read-only]
Timezone: Asia/Kolkata [read-only]
Logo URL: [Cloudinary path]
Favicon: [File path]
Social Links:
  - Instagram: @kaarihandmade
  - Facebook: facebook.com/kaari
  - Pinterest: pinterest.com/kaari
```

#### Save Behavior
- Edit any field
- Click Save
- Updates `settings` table (key-value store)
- Changes live immediately (no cache)

#### Data Model
```
settings (
  key: "store_name" | "store_email" | "support_phone" | ...
  value: [string value]
)
```

#### API Endpoints
- **GET** [/api/admin/settings](app/api/admin/settings/route.ts#L5) — Fetch all settings
- **PUT** [/api/admin/settings](app/api/admin/settings/route.ts#L30) — Update specific setting

### 9.2 Payment Gateway Settings
**Route**: `/admin/settings/payment`  
**File**: [app/admin/settings/payment/page.tsx](app/admin/settings/payment/page.tsx#L22)

#### Payment Configuration View
```
CASHFREE PAYMENT GATEWAY
┌──────────────────────────────────────┐
│ Status: ✅ Configured                 │
│ App ID: ***hidden*** [View]          │
│ Secret Key: ***hidden***             │
│ Mode: [Test | Production] — [Current: Test] │
└──────────────────────────────────────┘

PAYMENT METHODS
┌──────────────────────────────────────┐
│ ☑ UPI (Unified Payments Interface)  │
│ ☑ Credit Card (Enable/Disable)      │
│ ☑ Debit Card (Enable/Disable)       │
│ ☐ Net Banking (Enable/Disable)      │
│ ☐ Wallet (Enable/Disable)           │
└──────────────────────────────────────┘

WEBHOOK SETTINGS
┌──────────────────────────────────────┐
│ Webhook URL: [auto-filled]          │
│ Secret: ***hidden***                 │
│ Test Webhook: [Send Test] ✓         │
└──────────────────────────────────────┘
```

#### Actions
- **Test Connection** — Verify Cashfree API is reachable
- **Enable/Disable Methods** — Toggle payment options
- **View Test Credentials** — For sandbox testing
- **Switch Mode** — Test ↔ Production (warning: affects real transactions)
- **Regenerate Webhook Secret** — Get new key after breach

#### Security Notes
- ⚠️ **API Keys Never Displayed** — Always masked (***hidden***)
- ⚠️ **Server-Side Only** — Settings fetched server-only, never sent to client
- ✅ **Encrypted Storage** — Keys stored in Supabase encrypted

---

## 📊 10. ANALYTICS & STATS (Dashboard Backend)

**API Route**: GET [/api/admin/stats](app/api/admin/stats/route.ts#L11)  
**Powers**: Dashboard charts and metrics

### Query Parameters
```
/api/admin/stats?endpoint=orders&period=week&page=1&limit=10
```

### Available Endpoints
| Endpoint | Returns | Use Case |
|----------|---------|----------|
| `orders` | Order count by period | Chart: Orders trend |
| `revenue` | Revenue sum by period | Chart: Revenue trend |
| `status_distribution` | Count per order status | Chart: Order status pie |
| `top_products` | Best-selling products | Table: Top sellers |
| `customers` | New customers by period | Chart: Customer growth |
| `categories` | Products by category | Chart: Category distribution |
| `recent_orders` | Last N orders (sorted) | Table: Recent activity |

### Period Options
- `day` — Hourly aggregation, last 24 hours
- `week` — Daily aggregation, last 7 days
- `month` — Daily aggregation, last 30 days
- `year` — Monthly aggregation, last 12 months

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-10",
      "value": 150000,
      "count": 12
    },
    {
      "date": "2026-04-11",
      "value": 175000,
      "count": 15
    }
  ],
  "total": 325000,
  "average": 162500,
  "trend": "↑ 16.7%"
}
```

---

## 🔑 COMPLETE API ENDPOINT REFERENCE

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/admin/stats` | Fetch dashboard metrics | Admin |
| GET | `/api/admin/products` | List products (paginated, searchable) | Admin |
| POST | `/api/admin/products` | Create new product | Admin |
| PUT | `/api/admin/products` | Update product | Admin |
| DELETE | `/api/admin/products` | Delete product | Admin |
| GET | `/api/admin/orders` | List orders (via stats) | Admin |
| PATCH | `/api/admin/orders/[id]/tracking` | Update tracking info | Admin |
| GET | `/api/admin/reviews` | List reviews (via stats) | Admin |
| PATCH | `/api/admin/reviews/[id]` | Approve/reject review | Admin |
| DELETE | `/api/admin/reviews/[id]` | Delete review | Admin |
| GET | `/api/admin/media` | List media resources | Admin |
| DELETE | `/api/admin/media/delete` | Remove from product_media | Admin |
| DELETE | `/api/admin/media/delete-asset` | Remove from Cloudinary | Admin |
| GET | `/api/admin/coupons` | List coupons | Admin |
| POST | `/api/admin/coupons` | Create coupon | Admin |
| PATCH | `/api/admin/coupons/[id]` | Update coupon status | Admin |
| DELETE | `/api/admin/coupons/[id]` | Delete coupon | Admin |
| GET | `/api/admin/billboard` | Get billboard state | Admin |
| PUT | `/api/admin/billboard` | Save billboard ordering | Admin |
| GET | `/api/admin/settings` | Fetch all settings | Admin |
| PUT | `/api/admin/settings` | Update setting | Admin |
| GET | `/api/admin/settings/payment` | Get payment config | Admin |
| PUT | `/api/admin/settings/payment` | Update payment settings | Admin |

---

## ⚠️ INCOMPLETE ADMIN FEATURES

| Feature | Current State | Would Need |
|---------|---------------|-----------|
| **Customer Edit** | View-only | Form to update name, phone, address |
| **Order Creation** | Manual only (from checkout) | Admin form to create orders |
| **Inventory Management** | No UI (DB schema exists) | Stock level form, low stock alerts |
| **Bulk Operations** | Reviews only (partial) | Bulk product import, bulk order export |
| **Export/Reports** | None | CSV export for orders, products, customers |
| **Audit Logs** | Reviews only | Full system audit trail |
| **Multi-Admin Users** | Clerk roles only | Sub-admin permissions, role hierarchy |
| **Email Templates** | Hardcoded | Email template editor |
| **Notifications** | Order updates | Admin notification settings, alerts |
| **Tax Management** | Hardcoded as 0 | Tax calculation rules UI |
| **Shipping Zones** | Fixed pricing | Zone-based or weight-based rates |
| **Abandoned Carts** | No tracking | Recovery email campaigns |

---

## 🚨 KNOWN ISSUES IN ADMIN

1. **TypeScript Errors** — Admin routes may have untyped `any` casting
2. **Loading States** — Some pages show skeleton indefinitely if API slow
3. **Bulk Actions** — Only reviews support bulk; others need implementation
4. **Mobile Responsiveness** — Admin panel not fully mobile-optimized
5. **Error Handling** — Generic errors shown; user-friendly messages needed

---

## ✅ ADMIN SECURITY CHECKLIST

- ✅ All routes protected by middleware.ts
- ✅ Role checks in Clerk + Supabase
- ✅ API endpoints require admin auth
- ✅ No sensitive data logged to console
- ✅ Rate limiting exempts webhooks (correct)
- ⚠️ CLOUDINARY_API_SECRET not isolated (potential exposure)
- ⚠️ No audit logging except reviews module
- ⚠️ No 2FA for admin accounts

---

**Admin Panel Status**: ✅ **FULLY FUNCTIONAL** (10/10 modules complete)  
**Most Critical Missing Feature**: Guest checkout (revenue impact)  
**Next Priority**: Inventory management UI + export/reports

