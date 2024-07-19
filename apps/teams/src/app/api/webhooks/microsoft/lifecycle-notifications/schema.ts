import { z } from 'zod';

export const lifecycleEventSchema = z.object({
  value: z
    .object({
      subscriptionId: z.string(),
      lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
      resource: z.string(),
      // This is actually a tenantId, for some reason MS send different name even if in documentation it said otherwise
      organizationId: z.string(),
      subscriptionExpirationDateTime: z.string(),
    })
    .array(),
  validationTokens: z.string().array(),
});
