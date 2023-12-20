import { inngest } from '@/common/clients/inngest';
import { handleError } from '../../handle-error';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import { SyncJob } from '@/repositories/dropbox/types/types';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  const {
    organisationId,
    accessToken,
    isFirstScan,
    syncStartedAt,
    cursor,
    pathRoot,
    adminTeamMemberId,
  } = event.data;

  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const dbxFetcher = new DBXFetcher({
    accessToken,
  });

  const team = await step
    .run('fetch-users', async () => {
      return dbxFetcher.fetchUsers(cursor);
    })
    .catch(handleError);

  const pathSyncJobs = await step.run('format-path-sync-job', async () => {
    const job: SyncJob = {
      accessToken,
      organisationId,
      syncStartedAt,
      isFirstScan,
      pathRoot,
    };

    return team.members.map(({ profile: { team_member_id: teamMemberId } }) => {
      return {
        ...job,
        teamMemberId,
        adminTeamMemberId,
      };
    });
  });

  if (team.members.length > 0) {
    await step.sendEvent(
      'send-event-synchronize-folders-and-files',
      pathSyncJobs.map((sharedLinkJob) => ({
        name: 'data-protection/synchronize-folders-and-files',
        data: sharedLinkJob,
      }))
    );
  }

  if (team?.hasMore) {
    await step.sendEvent('send-event-create-path-sync-jobs', {
      name: 'data-protection/create-path-sync-jobs',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });
  }

  return {
    success: true,
  };
};

export const createPathSyncJobs = inngest.createFunction(
  {
    id: 'create-path-sync-jobs',
    // priority: {
    //   run: 'event.data.isFirstScan ? 600 : 0',
    // },
    // rateLimit: {
    //   limit: 1,
    //   key: 'event.data.organisationId',
    //   period: '1s',
    // },
    // retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/create-path-sync-jobs' },
  handler
);
