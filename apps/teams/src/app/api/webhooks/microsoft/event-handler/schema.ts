import { z } from 'zod';

export const subscriptionSchema = z.object({
  value: z
    .object({
      subscriptionId: z.string(),
      changeType: z.enum(['created', 'updated', 'deleted']),
      resource: z.string(),
      tenantId: z.string(),
    })
    .array(),
  validationTokens: z.string().array(),
});
