import { inngest } from '@/common/clients/inngest';
import { SyncJob } from './types';
import { handleError } from '../../handle-error';
import { fetchUsers } from './dropbox-calls/fetch-users';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  const { organisationId, accessToken, isFirstScan, syncStartedAt, cursor, pathRoot } = event.data;

  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const team = await step
    .run('run-fetch-users', async () => {
      return fetchUsers({
        accessToken,
        cursor,
      });
    })
    .catch(handleError);

  const sharedLinkJobs = await step.run('formate-share-link-job', async () => {
    const job: SyncJob = {
      accessToken,
      organisationId,
      syncStartedAt,
      isFirstScan,
      pathRoot,
    };

    const teamMembersIds =
      team.members.flatMap((member) => {
        const teamMemberId = member.profile.team_member_id;
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
      }) ?? [];

    return teamMembersIds;
  });

  // await step.run('inngest-console-log-create-shared-link-sync-jobs', async () => {
  //   console.log('----------create-shared-link-sync-jobs----------');
  //   console.log('team.members.length', team.members.length);
  //   console.log('team?.hasMore', team?.hasMore);
  //   console.log('------------------------------------------------');
  // });

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

  if (team?.hasMore) {
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

  // await step.run('inngest-console-log-create-path-sync-initiated', async () => {
  //   console.log('---------CREATE PATH SYNC JOB INITIATED---------');
  //   console.log('organisationId', organisationId);
  //   console.log('------------------------------------------------');
  // });
  // Once all the shared links are fetched, we can create path sync jobs for  all the users of organisation
  await step.sendEvent('send-event-create-path-sync-jobs', {
    name: 'data-protection/create-path-sync-jobs',
    data: {
      ...event.data,
    },
  });

  return {
    success: true,
  };
};

export const createSharedLinkSyncJobs = inngest.createFunction(
  {
    id: 'create-shared-link-sync-jobs',
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
  { event: 'data-protection/create-shared-link-sync-jobs' },
  handler
);
