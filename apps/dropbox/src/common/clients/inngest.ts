import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

const eventMap = {
  'tokens/run-refresh-tokens': {},
  'users/run-user-sync-jobs': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isFirstScan: z.boolean().default(false),
    }),
  },
  'users/run-user-sync-job-pagination': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isFirstScan: z.boolean().default(false),
    }),
  },
  'users/run-user-sync-job-pagination.completed': {
    data: z.object({
      organisationId: z.string(),
    }),
  },
};

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromZod(eventMap),
});
