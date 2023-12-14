import { z } from 'zod';

export const scanTriggeredWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
});
