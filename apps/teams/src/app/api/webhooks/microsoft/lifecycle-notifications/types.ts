import type { z } from 'zod';
import type { lifecycleEventSchema } from '@/app/api/webhooks/microsoft/lifecycle-notifications/schema';

export type MicrosoftLifecycleHandlerPayload = z.infer<typeof lifecycleEventSchema>;
