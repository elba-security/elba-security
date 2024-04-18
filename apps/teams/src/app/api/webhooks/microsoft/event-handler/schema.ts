import { z } from 'zod';
import { env } from '@/env';

export const subscriptionSchema = z.object({
  subscriptionId: z.string(),
  changeType: z.enum(['created', 'updated', 'deleted']),
  resource: z.string(),
  tenantId: z.string(),
  clientState: z.literal(env.MICROSOFT_WEBHOOK_SECRET_KEY),
});
