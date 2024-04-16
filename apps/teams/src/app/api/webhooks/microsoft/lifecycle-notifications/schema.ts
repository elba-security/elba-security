import { z } from 'zod';

export const lifecycleEventSchema = z.object({
  subscriptionId: z.string(),
  lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
  resource: z.string(),
  organisationId: z.string(),
  subscriptionExpirationDateTime: z.string(),
});
