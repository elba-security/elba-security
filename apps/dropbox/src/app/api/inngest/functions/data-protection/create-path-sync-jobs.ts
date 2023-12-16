import { inngest } from '@/common/clients/inngest';
import { SyncJob } from './types';
import { handleError } from '../../handle-error';
import { fetchUsers } from './dropbox-calls/fetch-users';
import { DbxFetcher } from '@/repositories/dropbox/clients/DBXFetcher';

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

  const dbxFetcher = new DbxFetcher({
    accessToken,
  });

  const team = await step
    .run('fetch-users', async () => {
      return dbxFetcher.fetchUsers(cursor);
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

    // Previous version of the code
    // We user path based sync is used, will not be used anymore

    // In this new integrations strategy, all the sync jobs will be personal
    // but the only difference is that  root pat will be included for admin to fet all the files and folders recursively
    // whe we provide  the root path, all the team folders & and the personal folder will be included  when we fetch the folder and files
    // since admin is the owner of the team folder & file this strategy will work(team folder & files will be  consider as personal)
    // however, isPersonal will be determine from the permissions, the permissions does contains the information of the owner,
    // if the  access_type: owner, then the file is personal, if the access_type: editor | viewer, then the file is team folder
    return team.members.flatMap(({ profile: { team_member_id: teamMemberId } }) => {
      return [
        {
          ...job,
          teamMemberId,
          adminTeamMemberId,
        },
      ];
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
