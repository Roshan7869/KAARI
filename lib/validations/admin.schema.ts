import { z } from 'zod';

// Admin Product Validation Schemas
export const AdminProductCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0).max(999999),
  currency: z.string().min(3).max(3).default('INR'),
  is_active: z.coerce.boolean().default(true),
  product_type: z.enum(['standard', 'customized']).default('standard'),
  allow_customization: z.coerce.boolean().default(false),
  category: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(200).optional(),
});

export const AdminProductUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0).max(999999).optional(),
  currency: z.string().min(3).max(3).optional(),
  is_active: z.coerce.boolean().optional(),
  product_type: z.enum(['standard', 'customized']).optional(),
  allow_customization: z.coerce.boolean().optional(),
  category: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(200).optional(),
});

export const AdminProductParamsSchema = z.object({
  id: z.string().uuid(),
});

// Admin Stats Validation Schemas
export const AdminStatsSchema = z.object({
  endpoint: z.enum(['products', 'revenue', 'orders', 'customers']).optional(),
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Admin Order Validation Schemas
export const AdminOrderUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]),
  notes: z.string().max(500).optional(),
});

export const AdminOrderCancelSchema = z.object({
  cancellation_reason: z.string().min(1).max(500).optional(),
});

export const AdminOrderParamsSchema = z.object({
  id: z.string().uuid(),
});

// Admin Cart Validation Schemas
export const AdminCartUpdateSchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned', 'merged']).optional(),
  notes: z.string().max(500).optional(),
});

export const AdminCartParamsSchema = z.object({
  id: z.string().uuid(),
});

// Admin Customer Validation Schemas
export const AdminCustomerUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  is_active: z.coerce.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const AdminCustomerParamsSchema = z.object({
  id: z.string().uuid(),
});

// Admin Notification Validation Schemas
export const AdminNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.string().min(1).max(50),
  channel: z.enum(['email', 'sms', 'push']).optional(),
  subject: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
  metadata: z.record(z.any()).optional(),
});

export type AdminProductCreateDto = z.infer<typeof AdminProductCreateSchema>;
export type AdminProductUpdateDto = z.infer<typeof AdminProductUpdateSchema>;
export type AdminStatsDto = z.infer<typeof AdminStatsSchema>;
export type AdminOrderUpdateDto = z.infer<typeof AdminOrderUpdateSchema>;
export type AdminOrderCancelDto = z.infer<typeof AdminOrderCancelSchema>;
export type AdminCartUpdateDto = z.infer<typeof AdminCartUpdateSchema>;
export type AdminCustomerUpdateDto = z.infer<typeof AdminCustomerUpdateSchema>;
export type AdminNotificationDto = z.infer<typeof AdminNotificationSchema>;
