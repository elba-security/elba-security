import { z } from 'zod';
import { baseWebhookSchema } from './common';

export const authenticationRefreshObjectRequestedWebhookDataSchema = baseWebhookSchema.and(
  z.object({
    id: z.string().min(1),
  })
);
