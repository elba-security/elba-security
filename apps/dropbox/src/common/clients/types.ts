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
});

const createSharedLinkSyncJobs = commonEventArgs.extend({
  adminTeamMemberId: z.string(),
  pathRoot: z.string(),
  cursor: z.string().optional(),
});

const createSharedLinkCompleteSyncJobs = commonEventArgs.extend({
  pathRoot: z.string(),
  cursor: z.string().optional(),
});

const createPathSyncJobsSchema = commonEventArgs.extend({
  adminTeamMemberId: z.string(),
  pathRoot: z.string(),
  cursor: z.string().optional(),
});

const syncFilesAndFoldersSchema = commonEventArgs.extend({
  pathRoot: z.string(),
  teamMemberId: z.string(),
  adminTeamMemberId: z.string(),
  cursor: z.string().optional(),
});

const runThirdPartyAppsSyncJobsSchema = commonEventArgs.extend({
  cursor: z.string().optional(),
});

export const synchronizeSharedLinks = commonEventArgs.extend({
  pathRoot: z.string(),
  cursor: z.string().optional(),
  teamMemberId: z.string(),
  isPersonal: z.boolean(),
});

const refreshThirdPartyAppsObjectsSchema = commonEventArgs.extend({
  teamMemberId: z.string(),
  syncStartedAt: z.string().optional(),
});

const deleteThirdPartyAppsObject = z.object({
  accessToken: z.string(),
  teamMemberId: z.string(),
  appId: z.string(),
});

export const zodEventSchemas = {
  'tokens/run-refresh-tokens': { data: runRefreshTokensSchema },
  'users/run-user-sync-jobs': { data: runUserSyncJobsSchema },
  'users/run-user-sync-jobs.completed': { data: runUserSyncJobsSchema },
  'data-protection/create-shared-link-sync-jobs': { data: createSharedLinkSyncJobs },
  'data-protection/synchronize-shared-links': { data: synchronizeSharedLinks },
  'shared-links/synchronize.shared-links.completed': { data: createSharedLinkCompleteSyncJobs },
  'data-protection/create-path-sync-jobs': { data: createPathSyncJobsSchema },
  'data-protection/synchronize-folders-and-files': { data: syncFilesAndFoldersSchema },
  'third-party-apps/run-sync-jobs': { data: runThirdPartyAppsSyncJobsSchema },
  'third-party-apps/refresh-objects': { data: refreshThirdPartyAppsObjectsSchema },
  'third-party-apps/delete-object': { data: deleteThirdPartyAppsObject },
};

export type InputArgWithTrigger<T extends keyof typeof zodEventSchemas> = GetFunctionInput<
  typeof inngest,
  T
>;
