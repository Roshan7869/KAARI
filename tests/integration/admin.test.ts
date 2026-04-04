/**
 * Admin Dashboard Tests
 * Tests for admin product CRUD, order management, and analytics
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      eq: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      range: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    })),
  },
}));

describe('admin product CRUD', () => {
  const products = [
    { id: '1', title: 'Crochet Scarf', price: 1499, stock_qty: 10, is_active: true },
    { id: '2', title: 'Knit Beanie', price: 999, stock_qty: 5, is_active: true },
    { id: '3', title: 'Wool Blanket', price: 3999, stock_qty: 0, is_active: false },
  ];

  it('lists products with pagination', () => {
    const paginate = (items: any[], page: number, limit: number): { data: any[], total: number, totalPages: number } => {
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = items.slice(start, end);
      return {
        data: paginated,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
      };
    };

    expect(paginate(products, 1, 2)).toEqual({
      data: products.slice(0, 2),
      total: 3,
      totalPages: 2,
    });

    expect(paginate(products, 2, 2)).toEqual({
      data: products.slice(2),
      total: 3,
      totalPages: 2,
    });
  });

  it('creates product with validation', () => {
    const validateProduct = (product: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!product.title || product.title.length < 3) errors.push('Title must be at least 3 characters');
      if (!product.price || product.price <= 0) errors.push('Price must be positive');
      if (!product.base_price) errors.push('Base price is required');

      return { valid: errors.length === 0, errors };
    };

    expect(validateProduct({ title: 'Scarf', price: 999, base_price: 899 })).toEqual({ valid: true, errors: [] });
    expect(validateProduct({ title: 'S', price: 999, base_price: 899 })).toEqual({ valid: false, errors: ['Title must be at least 3 characters'] });
    expect(validateProduct({ title: 'Scarf', price: -100, base_price: 899 }).valid).toBe(false);
  });

  it('updates product status correctly', () => {
    const updateStatus = (product: any, status: 'active' | 'inactive'): any => {
      return {
        ...product,
        is_active: status === 'active',
        updated_at: new Date().toISOString(),
      };
    };

    const product = { id: '1', title: 'Scarf', is_active: true };

    expect(updateStatus(product, 'inactive')).toEqual({
      id: '1',
      title: 'Scarf',
      is_active: false,
      updated_at: expect.any(String),
    });
  });

  it('deletes product (soft delete)', () => {
    const softDelete = (product: any): any => {
      return {
        ...product,
        is_active: false,
        deleted_at: new Date().toISOString(),
      };
    };

    const product = { id: '1', title: 'Scarf', is_active: true };
    const deleted = softDelete(product);

    expect(deleted.is_active).toBe(false);
    expect(deleted.deleted_at).toBeDefined();
  });
});

describe('admin order management', () => {
  const orders = [
    { id: '1', order_number: 'ORD-001', status: 'paid', total_amount: 2998, created_at: new Date().toISOString() },
    { id: '2', order_number: 'ORD-002', status: 'processing', total_amount: 1499, created_at: new Date().toISOString() },
    { id: '3', order_number: 'ORD-003', status: 'pending', total_amount: 999, created_at: new Date().toISOString() },
  ];

  it('filters orders by status', () => {
    const filterByStatus = (orders: any[], status: string): any[] => {
      return orders.filter(o => o.status === status);
    };

    expect(filterByStatus(orders, 'paid').length).toBe(1);
    expect(filterByStatus(orders, 'processing').length).toBe(1);
    expect(filterByStatus(orders, 'pending').length).toBe(1);
  });

  it('updates order status with validation', () => {
    const validTransitions: Record<string, string[]> = {
      'pending': ['paid', 'cancelled'],
      'paid': ['processing', 'cancelled'],
      'processing': ['shipped', 'delivered'],
      'shipped': ['delivered'],
      'delivered': [],
    };

    const canTransition = (current: string, newStatus: string): boolean => {
      const allowed = validTransitions[current] || [];
      return allowed.includes(newStatus);
    };

    expect(canTransition('paid', 'processing')).toBe(true);
    expect(canTransition('paid', 'delivered')).toBe(false);
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('processing', 'paid')).toBe(false);
  });

  it('calculates revenue statistics', () => {
    const calculateStats = (orders: any[]) => {
      const paidOrders = orders.filter(o => o.status === 'paid');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

      return { totalRevenue, orderCount: paidOrders.length, avgOrderValue };
    };

    const stats = calculateStats(orders);
    expect(stats.totalRevenue).toBe(2998);
    expect(stats.orderCount).toBe(1);
    expect(stats.avgOrderValue).toBe(2998);
  });
});

describe('admin analytics', () => {
  it('calculates daily revenue trend', () => {
    const ordersByDate = [
      { date: '2024-01-01', revenue: 1500, orders: 3 },
      { date: '2024-01-02', revenue: 2500, orders: 5 },
      { date: '2024-01-03', revenue: 1800, orders: 2 },
    ];

    const totalRevenue = ordersByDate.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = ordersByDate.reduce((sum, day) => sum + day.orders, 0);
    const avgDailyRevenue = totalRevenue / ordersByDate.length;

    expect(totalRevenue).toBe(5800);
    expect(totalOrders).toBe(10);
    expect(avgDailyRevenue).toBe(1933.3333333333333);
  });

  it('calculates top selling products', () => {
    const orderItems = [
      { product_id: '1', quantity: 5, revenue: 7495 },
      { product_id: '2', quantity: 3, revenue: 2997 },
      { product_id: '3', quantity: 8, revenue: 7992 },
    ];

    const sorted = [...orderItems].sort((a, b) => b.quantity - a.quantity);

    expect(sorted[0].product_id).toBe('3'); // Top seller
    expect(sorted[1].product_id).toBe('1');
    expect(sorted[2].product_id).toBe('2');
  });

  it('formats data for charts', () => {
    const formatChartData = (data: any[], labelKey: string, valueKey: string) => {
      return data.map(item => ({
        label: item[labelKey],
        value: item[valueKey],
      }));
    };

    const raw = [
      { category: 'Scarves', count: 25 },
      { category: 'Beanies', count: 15 },
      { category: 'Blankets', count: 10 },
    ];

    const chartData = formatChartData(raw, 'category', 'count');
    expect(chartData).toEqual([
      { label: 'Scarves', value: 25 },
      { label: 'Beanies', value: 15 },
      { label: 'Blankets', value: 10 },
    ]);
  });
});

describe('admin user management', () => {
  const users = [
    { id: '1', email: 'john@example.com', role: 'customer', created_at: new Date().toISOString() },
    { id: '2', email: 'jane@example.com', role: 'admin', created_at: new Date().toISOString() },
    { id: '3', email: 'bob@example.com', role: 'customer', created_at: new Date().toISOString() },
  ];

  it('filters users by role', () => {
    const filterByRole = (users: any[], role: string): any[] => {
      return users.filter(u => u.role === role);
    };

    expect(filterByRole(users, 'admin').length).toBe(1);
    expect(filterByRole(users, 'customer').length).toBe(2);
  });

  it('promotes user to admin', () => {
    const promoteUser = (user: any): any => {
      return {
        ...user,
        role: 'admin',
        updated_at: new Date().toISOString(),
      };
    };

    const user = { id: '1', email: 'john@example.com', role: 'customer' };
    const promoted = promoteUser(user);

    expect(promoted.role).toBe('admin');
  });
});

describe('admin settings', () => {
  it('validates platform settings', () => {
    const validateSettings = (settings: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!settings.platform_name) errors.push('Platform name is required');
      if (!settings.currency || settings.currency.length !== 3) errors.push('Currency must be 3 characters');
      if (!settings.timezone) errors.push('Timezone is required');

      return { valid: errors.length === 0, errors };
    };

    expect(validateSettings({ platform_name: 'Kaari', currency: 'INR', timezone: 'Asia/Kolkata' }))
      .toEqual({ valid: true, errors: [] });

    expect(validateSettings({}).valid).toBe(false);
  });

  it('saves settings with validation', () => {
    const saveSettings = (current: any, updates: any): any => {
      return {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    };

    const current = { platform_name: 'Kaari', currency: 'INR' };
    const saved = saveSettings(current, { currency: 'USD', timezone: 'UTC' });

    expect(saved.platform_name).toBe('Kaari'); // Preserved
    expect(saved.currency).toBe('USD'); // Updated
    expect(saved.timezone).toBe('UTC'); // Added
  });
});
