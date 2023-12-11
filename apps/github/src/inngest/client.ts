import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'github',
  schemas: new EventSchemas().fromZod({
    'users/page_sync.requested': {
      data: z.object({
        installationId: z.number().int().min(0),
        organisationId: z.string().uuid(),
        isFirstSync: z.boolean().default(false),
        accountLogin: z.string(),
        syncStartedAt: z.number(),
        cursor: z.string().nullable(),
      }),
    },
    'third-party-apps/page_sync.requested': {
      data: z.object({
        installationId: z.number().int().min(0),
        organisationId: z.string().uuid(),
        isFirstSync: z.boolean().default(false),
        accountLogin: z.string(),
        cursor: z.string().nullable(),
        syncStartedAt: z.number(),
      }),
    },
  }),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
});
