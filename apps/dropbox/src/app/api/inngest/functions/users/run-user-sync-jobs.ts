import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { elbaAccess } from '@/common/clients/elba';
import { handleError } from '../../handle-error';
import { formatElbaUsers } from './utils/format-elba-users';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import { InputArgWithTrigger } from '@/common/clients/types';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'users/run-user-sync-jobs'>) => {
  const { organisationId, accessToken, syncStartedAt, cursor } = event.data;

  const dbxAccess = new DBXFetcher({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  const users = await step
    .run('user-sync-initialize', async () => {
      const response = await dbxAccess.fetchUsers(cursor);

      if (response.members.length > 0) {
        await elba.users.update({
          users: formatElbaUsers(response.members),
        });
      }

      return response;
    })
    .catch(handleError);

  if (users?.hasMore) {
    await step.sendEvent('run-user-sync-job', {
      name: 'users/run-user-sync-jobs',
      data: { ...event.data, cursor: users.nextCursor },
    });
  } else {
    await elba.users.delete({
      syncedBefore: syncStartedAt,
    });
  }

  return {
    success: true,
  };
};

export const runUserSyncJobs = inngest.createFunction(
  {
    id: 'run-user-sync-jobs',
    retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  { event: 'users/run-user-sync-jobs' },
  handler
);
