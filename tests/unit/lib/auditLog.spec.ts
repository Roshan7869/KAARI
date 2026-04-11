/**
 * Unit Tests for lib/auditLog.ts
 *
 * Tests for admin audit logging functionality.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Define mock functions at module level (before vi.mock)
const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

// Create chainable query builder at module level
const createChain = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  };
  return chain;
};

// Mock RPC to return a chainable object with single()
const createRpcChain = () => ({
  single: vi.fn(),
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockAuthGetUser(),
    },
    from: (table: string) => mockFrom(table),
    rpc: (name: string, params: unknown) => mockRpc(name, params),
  },
}));

// Mock navigator for client metadata
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-agent/1.0',
  },
  writable: true,
});

import {
  logAdminAudit,
  logProductCreate,
  logProductUpdate,
  logProductDelete,
  logOrderStatusChange,
  logOrderRefund,
  logUserRoleChange,
  logSettingsUpdate,
  logPaymentGatewayConfig,
  getAuditLogs,
  getAuditLogStats,
} from '@/lib/auditLog';

// Helper to get mocks
const getMocks = () => ({ mockAuthGetUser, mockFrom, mockRpc, createChain, createRpcChain });

describe('auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAdminAudit', () => {
    it('returns error when not authenticated', async () => {
      const { mockAuthGetUser } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await logAdminAudit({
        action: 'product_create',
        resourceType: 'product',
        resourceId: 'prod-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user is not admin', async () => {
      const { mockAuthGetUser, mockRpc, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock RPC to return chain with single() method
      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: false, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const result = await logAdminAudit({
        action: 'product_create',
        resourceType: 'product',
        resourceId: 'prod-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('logs admin action successfully', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      // Mock RPC to return true (is admin)
      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      // Mock insert chain
      const chain = createChain();
      chain.insert.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await logAdminAudit({
        action: 'product_create',
        resourceType: 'product',
        resourceId: 'prod-123',
        changes: {
          after: { name: 'New Product', price: 100 },
        },
      });

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('admin_audit_log');
    });

    it('handles database insert error', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const chain = createChain();
      chain.insert.mockResolvedValue({
        error: { message: 'Database error' },
      });
      mockFrom.mockReturnValue(chain);

      const result = await logAdminAudit({
        action: 'product_create',
        resourceType: 'product',
        resourceId: 'prod-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('includes client metadata in audit log', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logAdminAudit({
        action: 'product_create',
        resourceType: 'product',
        resourceId: 'prod-123',
      });

      expect(insertedData).not.toBeNull();
      expect(insertedData!.ip_address).toBe('client-side');
      expect(insertedData!.user_agent).toBe('test-agent/1.0');
    });
  });

  describe('logProductCreate', () => {
    it('logs product creation with after state', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logProductCreate('prod-123', { name: 'New Product', price: 500 });

      expect(insertedData!.action).toBe('product_create');
      expect(insertedData!.resource_type).toBe('product');
      expect(insertedData!.resource_id).toBe('prod-123');
    });
  });

  describe('logProductUpdate', () => {
    it('logs product update with before and after states', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      const before = { name: 'Old Name', price: 100 };
      const after = { name: 'New Name', price: 150 };

      await logProductUpdate('prod-123', before, after);

      expect(insertedData!.action).toBe('product_update');
      expect(insertedData!.changes_before).toEqual(before);
      expect(insertedData!.changes_after).toEqual(after);
    });
  });

  describe('logProductDelete', () => {
    it('logs product deletion with before state', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      const productData = { name: 'Deleted Product', price: 200 };
      await logProductDelete('prod-123', productData);

      expect(insertedData!.action).toBe('product_delete');
      expect(insertedData!.changes_before).toEqual(productData);
    });
  });

  describe('logOrderStatusChange', () => {
    it('logs order status change', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logOrderStatusChange('order-123', 'processing', 'shipped', 'Ready for delivery');

      expect(insertedData!.action).toBe('order_status_change');
      expect(insertedData!.resource_type).toBe('order');
      expect(insertedData!.changes_before).toEqual({ status: 'processing' });
      expect(insertedData!.changes_after).toEqual({ status: 'shipped' });
      expect(insertedData!.metadata).toEqual({ reason: 'Ready for delivery' });
    });
  });

  describe('logOrderRefund', () => {
    it('logs order refund with amount and reason', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logOrderRefund('order-123', 5000, 'Customer request');

      expect(insertedData!.action).toBe('order_refund');
      expect(insertedData!.changes_after).toEqual({
        refundAmount: 5000,
        refundReason: 'Customer request',
      });
    });
  });

  describe('logUserRoleChange', () => {
    it('logs user role change', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logUserRoleChange('user-456', 'customer', 'admin');

      expect(insertedData!.action).toBe('user_role_change');
      expect(insertedData!.resource_type).toBe('user');
      expect(insertedData!.changes_before).toEqual({ role: 'customer' });
      expect(insertedData!.changes_after).toEqual({ role: 'admin' });
    });
  });

  describe('logSettingsUpdate', () => {
    it('logs settings update', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logSettingsUpdate('payment_gateway', 'cashfree', 'stripe');

      expect(insertedData!.action).toBe('settings_update');
      expect(insertedData!.changes_before).toEqual({ payment_gateway: 'cashfree' });
      expect(insertedData!.changes_after).toEqual({ payment_gateway: 'stripe' });
    });
  });

  describe('logPaymentGatewayConfig', () => {
    it('logs payment gateway configuration', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      let insertedData: Record<string, unknown> | null = null;
      const chain = createChain();
      chain.insert.mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });
      mockFrom.mockReturnValue(chain);

      await logPaymentGatewayConfig('gateway-1', { apiKey: 'xxx', enabled: true });

      expect(insertedData!.action).toBe('payment_gateway_config');
      expect(insertedData!.resource_type).toBe('payment_gateway');
      expect(insertedData!.changes_after).toEqual({ apiKey: 'xxx', enabled: true });
    });
  });

  describe('getAuditLogs', () => {
    it('returns error when not authenticated', async () => {
      const { mockAuthGetUser } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await getAuditLogs({});

      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when not admin', async () => {
      const { mockAuthGetUser, mockRpc, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: false, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const result = await getAuditLogs({});

      expect(result.data).toBeNull();
      expect(result.error).toContain('Not authorized');
    });

    it('fetches audit logs with filters', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const mockLogs = [
        { id: 'log-1', action: 'product_create', admin_id: 'admin-123' },
        { id: 'log-2', action: 'order_status_change', admin_id: 'admin-123' },
      ];

      const chain = createChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.gte.mockReturnThis();
      chain.lte.mockReturnThis();
      chain.order.mockReturnThis();
      chain.range.mockResolvedValue({
        data: mockLogs,
        error: null,
        count: 2,
      });

      mockFrom.mockReturnValue(chain);

      const result = await getAuditLogs({
        action: 'product_create',
        limit: 10,
      });

      expect(mockFrom).toHaveBeenCalledWith('admin_audit_log');
      expect(result.data).toEqual(mockLogs);
    });

    it('handles database error', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const chain = createChain();
      chain.select.mockReturnThis();
      chain.order.mockReturnThis();
      chain.range.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockFrom.mockReturnValue(chain);

      const result = await getAuditLogs({});

      expect(result.error).toBe('Database error');
    });
  });

  describe('getAuditLogStats', () => {
    it('returns error when not authenticated', async () => {
      const { mockAuthGetUser } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await getAuditLogStats(new Date(), new Date());

      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when not admin', async () => {
      const { mockAuthGetUser, mockRpc, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: false, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const result = await getAuditLogStats(new Date(), new Date());

      expect(result.error).toBe('Not authorized');
    });

    it('returns audit log statistics', async () => {
      const { mockAuthGetUser, mockRpc, mockFrom, createChain, createRpcChain } = getMocks();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      const rpcChain = createRpcChain();
      rpcChain.single.mockResolvedValue({ data: true, error: null });
      mockRpc.mockReturnValue(rpcChain);

      const mockLogs = [
        { action: 'product_create', admin_id: 'admin-1' },
        { action: 'product_create', admin_id: 'admin-1' },
        { action: 'order_status_change', admin_id: 'admin-2' },
      ];

      const chain = createChain();
      chain.select.mockReturnThis();
      chain.gte.mockReturnThis();
      chain.lte.mockResolvedValue({
        data: mockLogs,
        error: null,
      });

      mockFrom.mockReturnValue(chain);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await getAuditLogStats(startDate, endDate);

      expect(result.data).toBeDefined();
      expect(result.data!.totalActions).toBe(3);
      expect(result.data!.actionsByType['product_create']).toBe(2);
      expect(result.data!.actionsByType['order_status_change']).toBe(1);
    });
  });
});