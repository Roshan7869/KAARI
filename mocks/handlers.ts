import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () =>
    HttpResponse.json([
      { id: 'p1', name: 'Crochet Tote', slug: 'crochet-tote', base_price: 999, is_active: true, product_type: 'standard' },
      { id: 'p2', name: 'Hair Gajra', slug: 'hair-gajra', base_price: 499, is_active: true, product_type: 'customized' },
    ])
  ),

  http.get('/api/cart', () =>
    HttpResponse.json({ cartId: 'cart-1', items: [], pricing: { subtotal: 0, shipping: 0, tax: 0, total: 0 } })
  ),

  http.post('/api/products', () =>
    HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
  ),

  http.post('/api/social-order-intent', () =>
    HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ),

  http.post('/api/checkout', () =>
    HttpResponse.json({ success: true, orderId: 'order-test-1' })
  ),

  http.get('/api/health', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) return HttpResponse.json({ status: 'ok' });
    return HttpResponse.json({ status: 'ok', integrations: { cashfree: 'sandbox', supabase: 'connected' } });
  }),
];