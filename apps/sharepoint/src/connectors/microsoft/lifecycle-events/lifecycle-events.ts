import { z } from 'zod';

const lifecycleEventSchema = z.object({
  subscriptionId: z.string(),
  lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
  // This is actually a tenantId, for some reason MS send different name even if in documentation it said otherwise
  organizationId: z.string(),
  clientState: z.string(),
});

export type MicrosoftSubscriptionEvent = z.infer<typeof lifecycleEventSchema>;

export const lifecycleEventArraySchema = z.object({ value: z.array(lifecycleEventSchema) });
