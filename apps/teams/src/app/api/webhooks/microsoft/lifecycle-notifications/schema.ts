import { z } from 'zod';
import { env } from '@/env';

export const lifecycleEventSchema = z.object({
  subscriptionId: z.string(),
  lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
  resource: z.string(),
  organisationId: z.string(),
  subscriptionExpirationDateTime: z.string(),
  clientState: z.literal(env.MICROSOFT_WEBHOOK_SECRET_KEY),
});
