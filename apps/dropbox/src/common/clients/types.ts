import type { GetFunctionInput } from 'inngest';
import { z } from 'zod';
import type { inngest } from './inngest';

const runRefreshTokensSchema = z.object({
  organisationId: z.string(),
  refreshToken: z.string(),
});

const runUserSyncJobsSchema = z.object({
  organisationId: z.string(),
  accessToken: z.string(),
  isFirstScan: z.boolean().default(false),
  cursor: z.string().optional(),
  syncStartedAt: z.string(),
});

const commonEventArgs = z.object({
  organisationId: z.string(),
  accessToken: z.string(),
  syncStartedAt: z.string().datetime(),
  isFirstScan: z.boolean().default(false),
  pathRoot: z.string(),
  adminTeamMemberId: z.string().optional(),
});

const createSharedLinkSyncJobs = commonEventArgs.extend({
  cursor: z.string().optional(), // cursor of the team members
});

const createPathSyncJobsSchema = commonEventArgs.extend({
  cursor: z.string().optional(), // cursor of the team members
});

const syncFilesAndFoldersSchema = commonEventArgs.extend({
  cursor: z.string().optional(),
  teamMemberId: z.string(),
});

export const synchronizeSharedLinks = commonEventArgs.extend({
  cursor: z.string().optional(),
  teamMemberId: z.string(),
  isPersonal: z.boolean(),
});

export const zodEventSchemas = {
  'tokens/run-refresh-tokens': { data: runRefreshTokensSchema },
  'users/run-user-sync-jobs': { data: runUserSyncJobsSchema },
  'users/run-user-sync-jobs.completed': { data: runUserSyncJobsSchema },
  'data-protection/create-shared-link-sync-jobs': { data: createSharedLinkSyncJobs },
  'data-protection/synchronize-shared-links': { data: synchronizeSharedLinks },
  'shared-links/synchronize.shared-links.completed': { data: createSharedLinkSyncJobs },
  'data-protection/create-path-sync-jobs': { data: createPathSyncJobsSchema },
  'data-protection/synchronize-folders-and-files': { data: syncFilesAndFoldersSchema },
};

export type InputArgWithTrigger<T extends keyof typeof zodEventSchemas> = GetFunctionInput<
  typeof inngest,
  T
>;
