import { z } from 'zod';

export const SocialOrderIntentSchema = z.object({
  product_id: z.string().uuid(),
  platform: z.enum(['instagram', 'facebook', 'whatsapp', 'twitter']),
  user_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SocialOrderIntentDto = z.infer<typeof SocialOrderIntentSchema>;
