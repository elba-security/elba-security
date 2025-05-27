import { z } from 'zod';
import { baseWebhookSchema } from './common';

export const installationValidationRequestedWebhookDataSchema = baseWebhookSchema.extend({
  nangoConnectionId: z.string().min(1),
});

export type InstallationValidationRequestedWebhookData = z.infer<
  typeof installationValidationRequestedWebhookDataSchema
>;
