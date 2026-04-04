/**
 * Unit Tests for lib/email.ts
 *
 * Tests for email notification service.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// ============================================
// Mocks (must be at top for ES module hoisting)
// ============================================

// Mock rate limit functions BEFORE importing email.ts
const mockCheckRateLimit = vi.fn();
const mockRecordAttempt = vi.fn();

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  recordAttempt: mockRecordAttempt,
}));

// Mock the email templates
const mockRenderTemplate = vi.fn();

vi.mock('@/lib/email-templates', () => ({
  renderTemplate: mockRenderTemplate,
}));

// Mock the logger
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
    debug: vi.fn(),
  },
}));

// Mock Supabase client - export 'supabase' directly
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase: any = {
  rpc: mockRpc,
  from: mockFrom,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
};

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
  createClient: vi.fn(),
}));

// Mock fetch for sendEmailDirect
const originalFetch = global.fetch;

// ============================================
// Import after all mocks are set up
// ============================================

let emailModule: typeof import('@/lib/email');
let fetchMock: any;

beforeAll(async () => {
  emailModule = await import('@/lib/email');
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

// ============================================
// Tests: queueNotification
// ============================================

describe('queueNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: 'notification-123',
      error: null,
    });
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 99,
      resetAt: null,
      blocked: false,
    });
  });

  it('queues notification successfully', async () => {
    const result = await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
      orderId: 'order-123',
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBe('notification-123');
    expect(mockRpc).toHaveBeenCalledWith('queue_notification', {
      p_user_id: 'user-123',
      p_type: 'order_confirmation',
      p_channel: 'email',
      p_recipient: 'test@example.com',
      p_subject: 'Order Confirmation',
      p_content: 'Order confirmation content',
      p_order_id: 'order-123',
      p_metadata: {},
    });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Notification queued successfully', {
      notificationId: 'notification-123',
      type: 'order_confirmation',
      channel: 'email',
    });
  });

  it('applies rate limiting for email channel', async () => {
    await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(mockCheckRateLimit).toHaveBeenCalledWith('checkout', 'user-123');
    expect(mockRecordAttempt).toHaveBeenCalledWith('checkout', 'user-123', true);
  });

  it('blocks notification when rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      blocked: true,
      remaining: 0,
      resetAt: new Date(),
    });

    const result = await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many emails sent. Please try again later.');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith('Email rate limit exceeded', {
      userId: 'user-123',
      type: 'order_confirmation',
      remaining: 0,
      resetAt: expect.any(String),
    });
  });

  it('blocks notification with non-blocked rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      blocked: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const result = await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded. Please wait before sending more emails.');
  });

  it('returns error when RPC call fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to queue notification', {
      error: 'Database error',
      params: expect.any(Object),
    });
  });

  it('handles exceptions gracefully', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    const result = await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(mockLoggerError).toHaveBeenCalledWith('Exception while queuing notification', {
      error: 'Network error',
      params: expect.any(Object),
    });
  });

  it('does not apply rate limiting for non-email channels', async () => {
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });

    await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'sms',
      recipient: '+1234567890',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
    });

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalled();
  });

  it('includes metadata in the RPC call', async () => {
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });

    await emailModule.queueNotification({
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Order Confirmation',
      content: 'Order confirmation content',
      orderId: 'order-123',
      metadata: { custom: 'value', another: 123 },
    });

    expect(mockRpc).toHaveBeenCalledWith('queue_notification', expect.objectContaining({
      p_metadata: { custom: 'value', another: 123 },
    }));
  });
});

// ============================================
// Tests: sendOrderConfirmationEmail
// ============================================

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderTemplate.mockReturnValue({
      html: '<html><body>Order confirmed</body></html>',
      text: 'Order confirmed',
      subject: 'Order Confirmation',
    });
    mockRpc.mockResolvedValue({
      data: 'notification-123',
      error: null,
    });
  });

  it('sends order confirmation email successfully', async () => {
    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      totalAmount: 1500,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [],
      deliveryAddress: '123 Main St',
      estimatedDelivery: '2024-04-10',
    };

    const result = await emailModule.sendOrderConfirmationEmail(data, 'user-123');

    expect(result.success).toBe(true);
    expect(mockRenderTemplate).toHaveBeenCalledWith('order_confirmation', data);
    expect(mockRpc).toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith('Notification queued successfully', {
      notificationId: 'notification-123',
      type: 'order_confirmation',
      channel: 'email',
    });
  });

  it('handles template rendering error', async () => {
    mockRenderTemplate.mockImplementation(() => {
      throw new Error('Template error');
    });

    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      totalAmount: 1500,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [],
      deliveryAddress: '123 Main St',
      estimatedDelivery: '2024-04-10',
    };

    const result = await emailModule.sendOrderConfirmationEmail(data, 'user-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Template error');
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to render order confirmation email template', {
      error: expect.any(Error),
    });
  });

  it('includes order metadata', async () => {
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });

    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      totalAmount: 1500,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [],
      deliveryAddress: '123 Main St',
      estimatedDelivery: '2024-04-10',
    };

    await emailModule.sendOrderConfirmationEmail(data, 'user-123');

    expect(mockRpc).toHaveBeenCalledWith('queue_notification', expect.objectContaining({
      p_metadata: expect.objectContaining({
        order_id: 'order-123',
        order_number: '#ORD-123',
        total_amount: 1500,
        customer_name: 'John Doe',
        html_content: '<html><body>Order confirmed</body></html>',
        text_content: 'Order confirmed',
      }),
    }));
  });
});

// ============================================
// Tests: sendWelcomeEmail
// ============================================

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderTemplate.mockReturnValue({
      html: '<html><body>Welcome</body></html>',
      text: 'Welcome',
      subject: 'Welcome to Kaari',
    });
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });
  });

  it('sends welcome email successfully', async () => {
    const data = {
      email: 'john@example.com',
      userName: 'John Doe',
    };

    const result = await emailModule.sendWelcomeEmail(data, 'user-123');

    expect(result.success).toBe(true);
    expect(mockRenderTemplate).toHaveBeenCalledWith('welcome', data);
  });
});

// ============================================
// Tests: sendPaymentSuccessEmail
// ============================================

describe('sendPaymentSuccessEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderTemplate.mockReturnValue({
      html: '<html><body>Payment successful</body></html>',
      text: 'Payment successful',
      subject: 'Payment Received',
    });
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });
  });

  it('sends payment success email', async () => {
    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      transactionId: 'txn-abc',
      amount: 1500,
      paymentMethod: 'upi',
      email: 'john@example.com',
    };

    const result = await emailModule.sendPaymentSuccessEmail(data, 'user-123');

    expect(result.success).toBe(true);
  });
});

// ============================================
// Tests: sendPaymentFailedEmail
// ============================================

describe('sendPaymentFailedEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderTemplate.mockReturnValue({
      html: '<html><body>Payment failed</body></html>',
      text: 'Payment failed',
      subject: 'Payment Failed',
    });
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });
  });

  it('sends payment failed email', async () => {
    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      amount: 1500,
      failureReason: 'Insufficient funds',
      email: 'john@example.com',
    };

    const result = await emailModule.sendPaymentFailedEmail(data, 'user-123');

    expect(result.success).toBe(true);
  });
});

// ============================================
// Tests: sendOrderShippedEmail
// ============================================

describe('sendOrderShippedEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderTemplate.mockReturnValue({
      html: '<html><body>Order shipped</body></html>',
      text: 'Order shipped',
      subject: 'Order Shipped',
    });
    mockRpc.mockResolvedValue({ data: 'notification-123', error: null });
  });

  it('sends order shipped email with tracking', async () => {
    const data = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      carrier: 'DHL',
      trackingNumber: '123456789',
      trackingUrl: 'https://track.dhl.com/123456789',
      estimatedDelivery: '2024-04-15',
      email: 'john@example.com',
    };

    const result = await emailModule.sendOrderShippedEmail(data, 'user-123');

    expect(result.success).toBe(true);
  });
});

// ============================================
// Tests: fetchOrderDetailsForEmail
// ============================================

describe('fetchOrderDetailsForEmail', () => {
  // Each test sets up its own mock chains for the two queries (orders and order_items)
  // No beforeEach because vi.clearAllMocks() would clear the test-specific mock implementations

  it('fetches order details successfully', async () => {
    const mockOrder = {
      id: 'order-123',
      user_id: 'user-123',
      status: 'paid',
      total_amount: 1500,
      created_at: new Date().toISOString(),
      checkout_session_id: 'checkout-123',
      checkout_sessions: {
        shipping_name: 'John Doe',
        shipping_line1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
      },
    };

    const mockItems = [
      {
        products: { title: 'Crochet Scarf' },
        quantity: 2,
        unit_price: 750,
        variant_id: null,
        customization_snapshot: null,
      },
    ];

    const orderItemsResult = { data: mockItems, error: null };
    const orderResult = { data: mockOrder, error: null };

    const mockSingleOrders = vi.fn().mockResolvedValue(orderResult);

    // Note: order_items query does NOT call .single() - it just awaits the result from .eq()
    // So the mock for order_items should only mock up to .eq(), and .eq() should return
    // an object with data and error that we destructure
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingleOrders,
    };

    // For order_items, we need to return an object with .select(), .eq(), etc.
    // that when awaited returns the expected result
    const mockItemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(orderItemsResult),
    };

    const mockFromImpl = vi.fn().mockImplementation((table: string) => {
      return table === 'order_items' ? mockItemsChain : mockOrdersChain;
    });
    (mockFrom as any).mockImplementation(mockFromImpl);

    const result = await emailModule.fetchOrderDetailsForEmail('order-123');

    expect(result).not.toBeNull();
    expect(result?.order.id).toBe('order-123');
    expect(result?.order.checkout_sessions).toBeDefined();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].name).toBe('Crochet Scarf');
    expect(result?.shippingAddress.country).toBe('India');
  });

  it('returns null when order not found', async () => {
    // Mock the Supabase client to return an error when fetching orders
    const mockSingleOrders = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Order not found' },
    });
    // order_items query awaits result from .eq() directly, not .single()
    const mockItemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    (mockFrom as any).mockImplementation((table: string) => {
      if (table === 'order_items') {
        return mockItemsChain;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingleOrders,
      };
    });

    const result = await emailModule.fetchOrderDetailsForEmail('nonexistent');

    expect(result).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to fetch order', {
      error: { message: 'Order not found' },
      orderId: 'nonexistent',
    });
  });

  it('handles fetch items error', async () => {
    const mockOrder = {
      id: 'order-123',
      user_id: 'user-123',
      status: 'paid',
      total_amount: 1500,
      created_at: new Date().toISOString(),
      checkout_session_id: 'checkout-123',
      checkout_sessions: null,
    };

    // Mock the orders query to succeed
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };

    // Mock the order_items query to return an error
    // Note: order_items query awaits the result from .eq() directly
    const mockItemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Items not found' } }),
    };

    (mockFrom as any).mockImplementation((table: string) => {
      return table === 'order_items' ? mockItemsChain : mockOrdersChain;
    });

    const result = await emailModule.fetchOrderDetailsForEmail('order-123');

    expect(result).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to fetch order items', {
      error: { message: 'Items not found' },
      orderId: 'order-123',
    });
  });

  it('handles exceptions gracefully', async () => {
    // Mock orders query to throw an error
    const mockSingleOrders = vi.fn().mockRejectedValue(new Error('Database connection failed'));
    // order_items query awaits result from .eq() directly
    const mockItemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    (mockFrom as any).mockImplementation((table: string) => {
      if (table === 'order_items') {
        return mockItemsChain;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingleOrders,
      };
    });

    const result = await emailModule.fetchOrderDetailsForEmail('order-123');

    expect(result).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith('Exception fetching order details', {
      error: expect.any(Error),
      orderId: 'order-123',
    });
    expect((mockLoggerError.mock.calls[0][1] as any).error.message).toBe('Database connection failed');
  });

  it('uses default country when not specified', async () => {
    const mockOrder = {
      id: 'order-123',
      user_id: 'user-123',
      status: 'paid',
      total_amount: 1500,
      created_at: new Date().toISOString(),
      checkout_session_id: 'checkout-123',
      checkout_sessions: {
        shipping_name: 'John Doe',
        shipping_line1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        // Intentionally missing country to test default
      },
    };

    const mockSingleOrders = vi.fn().mockResolvedValue({
      data: mockOrder,
      error: null,
    });
    // order_items query awaits result from .eq() directly
    const mockItemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    (mockFrom as any).mockImplementation((table: string) => {
      if (table === 'order_items') {
        return mockItemsChain;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingleOrders,
      };
    });

    const result = await emailModule.fetchOrderDetailsForEmail('order-123');

    expect(result).not.toBeNull();
    expect(result?.shippingAddress.country).toBe('India');
  });
});

// ============================================
// Tests: sendEmailDirect
// ============================================

describe('sendEmailDirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email via Resend API successfully', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => ({ id: 'msg-123' }),
    });

    const result = await emailModule.sendEmailDirect(
      're_123',
      'noreply@kaari.com',
      'john@example.com',
      'Test Subject',
      '<p>Test HTML</p>',
      'Test text'
    );

    expect(result.success).toBe(true);
    expect(result.id).toBe('msg-123');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer re_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@kaari.com',
        to: ['john@example.com'],
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      }),
    });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Email sent successfully via Resend', {
      id: 'msg-123',
      to: 'john@example.com',
      subject: 'Test Subject',
    });
  });

  it('handles API error response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => ({ message: 'Invalid email address' }),
    });

    const result = await emailModule.sendEmailDirect(
      're_123',
      'noreply@kaari.com',
      'invalid-email',
      'Test Subject',
      '<p>Test</p>'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email address');
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to send email via Resend', {
      status: 400,
      error: { message: 'Invalid email address' },
    });
  });

  it('handles network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const result = await emailModule.sendEmailDirect(
      're_123',
      'noreply@kaari.com',
      'john@example.com',
      'Test Subject',
      '<p>Test</p>'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(mockLoggerError).toHaveBeenCalledWith('Exception sending email', {
      error: 'Network error',
    });
  });

  it('works without text fallback', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => ({ id: 'msg-123' }),
    });

    await emailModule.sendEmailDirect(
      're_123',
      'noreply@kaari.com',
      'john@example.com',
      'Test Subject',
      '<p>Test HTML</p>'
    );

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.text).toBeUndefined();
  });
});

// ============================================
// Tests: Type exports
// ============================================

describe('Type exports', () => {
  it('exports NotificationChannel type', () => {
    const emailChannel: emailModule.NotificationChannel = 'email';
    const smsChannel: emailModule.NotificationChannel = 'sms';
    const pushChannel: emailModule.NotificationChannel = 'push';

    expect(emailChannel).toBe('email');
    expect(smsChannel).toBe('sms');
    expect(pushChannel).toBe('push');
  });

  it('exports EmailOptions interface', () => {
    const options: emailModule.EmailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test',
      from: 'noreply@kaari.com',
      replyTo: 'support@kaari.com',
    };

    expect(options.to).toBe('test@example.com');
  });

  it('exports QueueNotificationParams interface', () => {
    const params: emailModule.QueueNotificationParams = {
      userId: 'user-123',
      type: 'order_confirmation' as any,
      channel: 'email',
      recipient: 'test@example.com',
      subject: 'Test',
      content: 'Content',
      orderId: 'order-123',
      metadata: { custom: 'value' },
    };

    expect(params.userId).toBe('user-123');
  });

  it('exports OrderConfirmationData type', () => {
    const data: emailModule.OrderConfirmationData = {
      orderId: 'order-123',
      orderNumber: '#ORD-123',
      totalAmount: 1500,
      customerName: 'John Doe',
      email: 'john@example.com',
      items: [],
      shippingAddress: {},
    };

    expect(data.orderId).toBe('order-123');
  });

  it('exports WelcomeData type', () => {
    const data: emailModule.WelcomeData = {
      email: 'john@example.com',
      userName: 'John Doe',
    };

    expect(data.userName).toBe('John Doe');
  });
});
