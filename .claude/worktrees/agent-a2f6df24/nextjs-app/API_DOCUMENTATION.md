# Kaari Marketplace API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a valid Supabase session token in the `Authorization` header:

```
Authorization: Bearer {session_token}
```

### Admin Access
Endpoints marked with 🔐 Admin require:
1. Valid authentication token
2. `admin` role in `user_roles` table

To grant admin access:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-id-here', 'admin');
```

---

## Endpoints

### 🛍️ Products

#### GET /api/products
List all products with filtering and pagination.

**Query Parameters:**
- `search` (string): Search by title or description
- `category` (string): Filter by category
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 100)

**Example:**
```bash
curl "http://localhost:3000/api/products?search=cushion&page=1&limit=12"
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Purple Cushion",
      "slug": "purple-cushion",
      "description": "...",
      "product_variants": [...],
      "product_media": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4
  }
}
```

---

#### GET /api/products/:slug
Get single product details.

**Example:**
```bash
curl "http://localhost:3000/api/products/purple-cushion"
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Purple Cushion",
  "slug": "purple-cushion",
  "price": 1299,
  "description": "...",
  "allow_customization": true,
  "product_variants": [
    {
      "id": "uuid",
      "sku": "PC-SMALL",
      "price": 1299,
      "stock_qty": 15,
      "is_default": true
    }
  ],
  "product_media": [
    {
      "url": "https://...",
      "alt_text": "Product image",
      "sort_order": 0
    }
  ]
}
```

---

#### POST /api/products 🔐 Admin
Create a new product.

**Request Body:**
```json
{
  "title": "New Product",
  "slug": "new-product",
  "description": "Product description",
  "price": 999,
  "category": "cushions",
  "allow_customization": false,
  "is_active": true
}
```

**Response:** Product object (201 Created)

---

#### PUT /api/products/:slug 🔐 Admin
Update product details.

**Request Body:** (same as POST, all fields optional)

**Response:** Updated product object

---

#### DELETE /api/products/:slug 🔐 Admin
Delete a product.

**Response:**
```json
{ "success": true }
```

---

### 🛒 Cart

#### GET /api/cart
Get current user's active cart.

**Headers:**
```
Authorization: Bearer {session_token}
```

**Response:**
```json
{
  "cart": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "active",
    "currency": "INR",
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "quantity": 2,
        "unit_price": 1299,
        "line_total": 2598,
        "customization": null
      }
    ],
    "created_at": "2026-03-22T10:00:00Z"
  }
}
```

---

#### POST /api/cart
Add item to cart.

**Request Body:**
```json
{
  "product_id": "uuid",
  "variant_id": "uuid",
  "quantity": 2,
  "unit_price": 1299,
  "customization": {
    "message": "Custom message",
    "preferredColor": "red",
    "quoteStatus": "pending"
  }
}
```

**Response:** Cart item object (201 Created)

---

#### PUT /api/cart/:id
Update cart item quantity.

**Request Body:**
```json
{ "quantity": 3 }
```

**Response:** Updated cart item

---

#### DELETE /api/cart/:id
Remove item from cart.

**Response:**
```json
{ "success": true }
```

---

### 💳 Checkout

#### POST /api/checkout
Create order from active cart.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "MH",
  "zipCode": "400001",
  "paymentMethod": "cod"
}
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "total": 2598,
    "created_at": "2026-03-22T10:00:00Z"
  },
  "payment": {
    "id": "uuid",
    "amount": 2598,
    "status": "pending"
  },
  "redirect_url": "/dummy-payment?session_id=..."
}
```

---

### 📦 Orders

#### GET /api/orders
Get user's orders.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "status": "paid",
      "total": 2598,
      "created_at": "2026-03-22T10:00:00Z",
      "order_items": [...],
      "order_status_events": [...]
    }
  ]
}
```

---

#### GET /api/orders/:id
Get order details.

**Response:** Single order object

---

#### PUT /api/orders/:id 🔐 Admin
Update order status.

**Request Body:**
```json
{ "status": "processing" }
```

Valid statuses: `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`

**Response:** Updated order object

---

### 🔔 Webhooks

#### POST /api/webhooks/payment
Payment gateway webhook.

**Headers:**
```
x-webhook-signature: {signature}
```

**Request Body:**
```json
{
  "session_id": "...",
  "order_id": "uuid",
  "status": "completed",
  "transaction_id": "txn_..."
}
```

**Response:**
```json
{ "success": true }
```

---

### 👨‍💼 Admin

#### GET /api/admin/products 🔐 Admin
List all products (admin view).

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `search` (string)

**Response:**
```json
{
  "products": [...],
  "pagination": {...}
}
```

---

#### GET /api/admin/orders 🔐 Admin
List all orders (admin view).

**Response:**
```json
{
  "orders": [...],
  "pagination": {...}
}
```

---

#### GET /api/health
Health check endpoint (public).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-22T10:00:00Z"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{ "error": "Invalid request body" }
```

### 401 - Unauthorized
```json
{ "error": "Unauthorized" }
```

### 403 - Forbidden
```json
{ "error": "Forbidden: Admin access required" }
```

### 404 - Not Found
```json
{ "error": "Product not found" }
```

### 500 - Internal Server Error
```json
{ "error": "Internal server error" }
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Fetch products
const response = await fetch('/api/products?page=1&limit=12');
const { products, pagination } = await response.json();

// Add to cart
const cartResponse = await fetch('/api/cart', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({
    product_id: 'uuid',
    variant_id: 'uuid',
    quantity: 2,
    unit_price: 1299,
  }),
});

// Checkout
const checkoutResponse = await fetch('/api/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '9876543210',
    address: '123 Main St',
    city: 'Mumbai',
    state: 'MH',
    zipCode: '400001',
    paymentMethod: 'cod',
  }),
});

const { order, redirect_url } = await checkoutResponse.json();
window.location.href = redirect_url;
```

---

## Rate Limiting

Default rate limits per IP:
-  **Login**: 5 attempts per 15 minutes
- **Signup**: 3 attempts per hour
- **Payment**: 5 attempts per hour
- **General API**: 100 requests per minute

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1648000000
```

---

## Pagination

All list endpoints support pagination:

**Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 12-20): Items per page

**Response includes:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4
  }
}
```

---

## Troubleshooting API Issues

### "Unauthorized" on protected endpoint
- Check Authorization header format: `Bearer {token}`
- Verify session token is valid and not expired
- Check user is logged in

### "Insufficient stock"
- Product variant has fewer items than requested
- Reduce quantity or wait for restock

### "CORS error"
- Endpoint not allowing your domain
- Check API is deployed and accessible
- Verify request headers are correct

### "404 Not Found" on POST
- Check endpoint path is correct
- POST endpoint must be defined in `/app/api/`
- Verify request method matches route

---

**API Documentation Last Updated**: March 22, 2026
**API Version**: 1.0
**Status**: ✅ Production Ready
