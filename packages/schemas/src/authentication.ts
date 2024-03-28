import { z } from 'zod';

export const authenticationRefreshObjectRequestedWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
  id: z.string().min(1),
});
