import { z } from 'zod';

export const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).max(100),
  unit_price: z.coerce.number().min(0),
  line_total: z.coerce.number().min(0),
});

export const CartUpdateSchema = z.object({
  cart_id: z.string().uuid(),
  items: z.array(CartItemSchema),
});

export const CartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100),
});

export const CartClearSchema = z.object({
  cart_id: z.string().uuid(),
});

export type CartItemDto = z.infer<typeof CartItemSchema>;
export type CartUpdateDto = z.infer<typeof CartUpdateSchema>;
export type CartItemUpdateDto = z.infer<typeof CartItemUpdateSchema>;
export type CartClearDto = z.infer<typeof CartClearSchema>;
