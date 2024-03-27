import type { z } from 'zod';
import type { elbaPayloadSchema } from '@/app/api/webhooks/elba/data-protection/schemes';

export type ElbaPayload = z.infer<typeof elbaPayloadSchema>;
