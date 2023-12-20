import { EventSchemas, Inngest, type GetFunctionInput } from 'inngest';
import { z } from 'zod';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export type InngestFunctionInputArg = GetFunctionInput<typeof inngest>;

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
      pagination: z.string().optional(),
    }),
  },
  'data-protection/create-shared-link-sync-jobs': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isFirstScan: z.boolean().default(false),
      syncStartedAt: z.string(),
      cursor: z.string().optional(),
      pathRoot: z.number(),
    }),
  },
  'data-protection/synchronize-shared-links': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isPersonal: z.boolean(),
      pagination: z.string().optional(),
      teamMemberId: z.string(),
      pathRoot: z.number(),
    }),
  },
  'data-protection/create-path-sync-jobs': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isFirstScan: z.boolean().default(false),
      syncStartedAt: z.string(),
      cursor: z.string().optional(),
      pathRoot: z.number(),
      adminTeamMemberId: z.string().optional(),
    }),
  },
  'data-protection/synchronize-folders-and-files': {
    data: z.object({
      organisationId: z.string(),
      accessToken: z.string(),
      isPersonal: z.boolean(),
      pagination: z.string().optional(),
      teamMemberId: z.string(),
      pathRoot: z.number(),
    }),
  },
};

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'dropbox',
  // schemas: new EventSchemas().fromZod(eventMap),
});
