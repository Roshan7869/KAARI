import { z } from 'zod';

export const CreateReviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  is_published: z.boolean().optional(),
});

export const ReviewParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
