import type { FunctionHandler } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';
import { inngest } from '@/common/clients/inngest';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import type { SyncJob } from '@/repositories/dropbox/types/types';
import { handleError } from '../../handle-error';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/create-shared-link-sync-jobs'>) => {
  const { organisationId, accessToken, isFirstScan, syncStartedAt, pathRoot, cursor } = event.data;

  const dbxFetcher = new DBXFetcher({
    accessToken,
  });

  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const team = await step
    .run('run-fetch-users', async () => {
      return dbxFetcher.fetchUsers(cursor);
    })
    .catch(handleError);

  if (!team) {
    throw new Error(`Team is undefined for the organisation ${organisationId}`);
  }

  const sharedLinkJobs = await step.run('formate-share-link-job', async () => {
    const job: SyncJob = {
      accessToken,
      organisationId,
      syncStartedAt,
      isFirstScan,
      pathRoot,
    };

    return (
      team.members.flatMap(({ profile: { team_member_id: teamMemberId } }) => {
        return [
          {
            ...job,
            teamMemberId,
            isPersonal: false,
          },
          {
            ...job,
            teamMemberId,
            isPersonal: true,
          },
        ];
      }) ?? []
    );
  });

  if (team.members.length > 0) {
    const eventsToWait = sharedLinkJobs.map(
      async (sharedLinkJob) =>
        await step.waitForEvent(`wait-for-shared-links-to-be-fetched`, {
          event: 'shared-links/synchronize.shared-links.completed',
          timeout: '1 day',
          if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${sharedLinkJob.teamMemberId}' && async.data.isPersonal == ${sharedLinkJob.isPersonal}`,
        })
    );

    await step.sendEvent(
      'send-event-synchronize-shared-links',
      sharedLinkJobs.map((sharedLinkJob) => ({
        name: 'data-protection/synchronize-shared-links',
        data: sharedLinkJob,
      }))
    );

    await Promise.all(eventsToWait);
  }

  if (team.hasMore) {
    await step.sendEvent('send-shared-link-sync-jobs', {
      name: 'data-protection/create-shared-link-sync-jobs',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });

    return {
      success: true,
    };
  }

  // Once all the shared links are fetched, we can create path sync jobs for  all the users of organisation
  await step.sendEvent('send-event-create-path-sync-jobs', {
    name: 'data-protection/create-path-sync-jobs',
    data: {
      accessToken,
      organisationId,
      syncStartedAt,
      isFirstScan,
      pathRoot,
      adminTeamMemberId: event.data.adminTeamMemberId,
    },
  });

  return {
    success: true,
  };
};

export const createSharedLinkSyncJobs = inngest.createFunction(
  {
    id: 'create-shared-link-sync-jobs',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/create-shared-link-sync-jobs' },
  handler
);
