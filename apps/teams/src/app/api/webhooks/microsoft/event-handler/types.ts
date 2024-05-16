import type { z } from 'zod';
import type { subscriptionSchema } from '@/app/api/webhooks/microsoft/event-handler/schema';

export type MicrosoftEventHandlerPayload = z.infer<typeof subscriptionSchema>;
