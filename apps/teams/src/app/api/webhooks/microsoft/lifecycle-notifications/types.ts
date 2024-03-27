import type { z } from 'zod';
import type { lifecycleEventSchema } from '@/app/api/webhooks/microsoft/lifecycle-notifications/route';

export type MicrosoftSubscriptionEvent = z.infer<typeof lifecycleEventSchema>;
