import type { z } from 'zod';
import type { subscriptionSchema } from '@/app/api/webhooks/microsoft/event-handler/schema';

export type SubscriptionPayload = z.infer<typeof subscriptionSchema>;

export type WebhookResponse<T> = {
  value: T[];
};
