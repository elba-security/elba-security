import type { GetFunctionInput } from 'inngest';
import { z } from 'zod';
import type { inngest } from './inngest';

const runRefreshTokensSchema = z.object({
  organisationId: z.string(),
});

const runUserSyncJobsSchema = z.object({
  organisationId: z.string(),
  isFirstSync: z.boolean().default(false),
  cursor: z.string().optional(),
  syncStartedAt: z.string(),
});

export const zodEventSchemas = {
  'tokens/run-refresh-token': { data: runRefreshTokensSchema },
  'users/run-user-sync-jobs': { data: runUserSyncJobsSchema },
  'users/run-user-sync-jobs.completed': { data: runUserSyncJobsSchema },
};

export type InputArgWithTrigger<T extends keyof typeof zodEventSchemas> = GetFunctionInput<
  typeof inngest,
  T
>;
