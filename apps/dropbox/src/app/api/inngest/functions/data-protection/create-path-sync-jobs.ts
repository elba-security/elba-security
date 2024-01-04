import { inngest } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import type { SyncJob } from '@/repositories/dropbox/types/types';
import { handleError } from '../../handle-error';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/create-path-sync-jobs'>) => {
  const {
    organisationId,
    accessToken,
    isFirstScan,
    syncStartedAt,
    pathRoot,
    adminTeamMemberId,
    cursor,
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

  if (!team) {
    throw new Error(`Team is undefined for the organisation ${organisationId}`);
  }

  const pathSyncJobs = await step.run('format-path-sync-job', () => {
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
      pathSyncJobs.map((pathSyncJob) => ({
        name: 'data-protection/synchronize-folders-and-files',
        data: pathSyncJob,
      }))
    );
  }

  if (team.hasMore) {
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
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/create-path-sync-jobs' },
  handler
);
