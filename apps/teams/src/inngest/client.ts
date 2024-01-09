import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';
import { env } from '@/env';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'teams',
  eventKey: env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromZod({
    'users/page_sync.requested': {
      data: z.object({
        organisationId: z.string().uuid(),
        access_token: z.string(),
        refresh_token: z.string(),
        isFirstSync: z.boolean().default(false),
        syncStartedAt: z.number(),
        cursor: z.string().nullable(),
      }),
    },
    'third-party-apps/page_sync.requested': {
      data: z.object({
        organisationId: z.string().uuid(),
        access_token: z.string(),
        refresh_token: z.string(),
        isFirstSync: z.boolean().default(false),
        syncStartedAt: z.number(),
        cursor: z.string().nullable(),
      }),
    },
  }),
  middleware: [rateLimitMiddleware],
});
