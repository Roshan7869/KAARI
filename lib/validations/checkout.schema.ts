import { z } from 'zod';

export const CheckoutSchema = z.object({
  cart_id: z.string().uuid(),
  payment_method: z.enum(['cod', 'online', 'upi', 'card', 'netbanking', 'wallet']).default('cod'),
  email: z.string().email().min(1).max(255).optional(),
  phone: z.string().min(10).max(15).optional(),
  shipping_name: z.string().min(1).max(100).optional(),
  shipping_line1: z.string().min(1).max(200).optional(),
  shipping_line2: z.string().max(200).optional(),
  shipping_city: z.string().min(1).max(100).optional(),
  shipping_state: z.string().min(1).max(100).optional(),
  shipping_postal_code: z.string().min(5).max(10).optional(),
  shipping_country: z.string().min(2).max(100).default('India'),
  shipping_method: z.enum(['standard', 'express', 'priority']).default('standard'),
  shipping_amount: z.coerce.number().min(0).optional(),
  tax_amount: z.coerce.number().min(0).optional(),
  shipping_provider: z.string().max(50).optional(),
  shipping_provider_label: z.string().max(100).optional(),
  coupon_code: z.string().min(3).max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const OrderParamsSchema = z.object({
  id: z.string().uuid(),
});

export const OrderStatusUpdateSchema = z.object({
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

export const OrderCancelSchema = z.object({
  cancellation_reason: z.string().min(1).max(500).optional(),
});

export type CheckoutDto = z.infer<typeof CheckoutSchema>;
export type OrderStatusUpdateDto = z.infer<typeof OrderStatusUpdateSchema>;
export type OrderCancelDto = z.infer<typeof OrderCancelSchema>;
