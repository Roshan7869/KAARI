import { z } from 'zod';

export const ProductListSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'price', 'title', 'sold_count', 'average_rating']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const ProductCreateSchema = z.object({
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

export const ProductUpdateSchema = z.object({
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

export const ProductParamsSchema = z.object({
  id: z.string().uuid(),
});

export const VariantCreateSchema = z.object({
  product_id: z.string().uuid(),
  sku: z.string().min(1).max(50).optional(),
  size: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(50).optional(),
  material: z.string().min(1).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  stock_qty: z.coerce.number().int().min(0).default(0),
  production_days: z.coerce.number().int().min(1).optional(),
  is_default: z.coerce.boolean().optional(),
});

export const VariantUpdateSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  size: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(50).optional(),
  material: z.string().min(1).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  stock_qty: z.coerce.number().int().min(0).optional(),
  production_days: z.coerce.number().int().min(1).optional(),
  is_default: z.coerce.boolean().optional(),
});

export const MediaCreateSchema = z.object({
  product_id: z.string().uuid(),
  file_path: z.string().min(1).max(500),
  alt_text: z.string().max(200).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export type ProductListDto = z.infer<typeof ProductListSchema>;
export type ProductCreateDto = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateDto = z.infer<typeof ProductUpdateSchema>;
export type VariantCreateDto = z.infer<typeof VariantCreateSchema>;
export type VariantUpdateDto = z.infer<typeof VariantUpdateSchema>;
export type MediaCreateDto = z.infer<typeof MediaCreateSchema>;
