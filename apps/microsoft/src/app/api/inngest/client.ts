import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

export const inngest = new Inngest({
  id: 'microsoft',
  schemas: new EventSchemas().fromZod({
    'users/start': {
      data: z.object({
        tenantId: z.string(),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'users/scan': {
      data: z.object({
        tenantId: z.string(),
        accessToken: z.string(),
        organizationId: z.string(),
        syncStartedAt: z.string(),
        cursor: z.string().optional(),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'third-party-apps/start': {
      data: z.object({
        tenantId: z.string(),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'third-party-apps/scan': {
      data: z.object({
        tenantId: z.string(),
        accessToken: z.string(),
        organizationId: z.string(),
        syncStartedAt: z.string(),
        cursor: z.string().optional(),
        isFirstScan: z.boolean().default(false),
      }),
    },
  }),
});
