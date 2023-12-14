import { inngest } from '@/common/clients/inngest';
import { SyncJob } from './types';
import { handleError } from '../../handle-error';
import { fetchUsers } from './dropbox-calls/fetch-users';

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

  const team = await step
    .run('fetch-users', async () => {
      return fetchUsers({
        accessToken,
        cursor,
      });
    })
    .catch(handleError);

  // await step.run('inngest-console-log-create-path-sync-jobs', async () => {
  //   console.log('--------------create-path-sync-jobs------------');
  //   console.log('team.members.length', team.members.length);
  //   console.log('team?.hasMore', team?.hasMore);
  //   console.log('------------------------------------------------');
  // });

  const pathSyncJobs = await step.run('format-path-sync-job', async () => {
    const job: SyncJob & { path: string } = {
      accessToken,
      organisationId,
      path: '',
      syncStartedAt,
      isFirstScan,
      pathRoot,
      level: 0,
    };

    const teamMembersIds =
      [
        ...team.members.flatMap(({ profile: { team_member_id: teamMemberId } }) => {
          return [
            {
              ...job,
              teamMemberId,
              adminTeamMemberId,
              isPersonal: true,
            },
          ];
        }),
        {
          ...job,
          teamMemberId: adminTeamMemberId,
          adminTeamMemberId,
          isPersonal: false,
        },
      ] ?? [];

    return teamMembersIds;
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
