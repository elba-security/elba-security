import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { elbaAccess } from '@/common/clients/elba';
import { DBXUsers } from '@/repositories/dropbox/clients/dbx-users';
import { InputArgWithTrigger } from '@/common/clients/types';
import { getOrganisationAccessDetails } from '../common/data';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'users/run-user-sync-jobs'>) => {
  const { organisationId, syncStartedAt, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Access token not found for organisation with ID: ${organisationId}`);
  }

  const { accessToken, region } = organisation;

  const elba = elbaAccess({
    organisationId,
    region,
  });

  const users = await step.run('user-sync-initialize', async () => {
    const dbx = new DBXUsers({
      accessToken,
    });

    const { members, ...rest } = await dbx.fetchUsers(cursor);

    if (members.length > 0) {
      await elba.users.update({
        users: members,
      });
    }

    return rest;
  });

  if (users?.hasMore) {
    await step.sendEvent('run-user-sync-job', {
      name: 'users/run-user-sync-jobs',
      data: { ...event.data, cursor: users.nextCursor },
    });

    return {
      success: true,
    };
  }

  await step.run('user-sync-finalize', async () => {
    await elba.users.delete({
      syncedBefore: syncStartedAt,
    });
  });

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
      run: 'event.data.isFirstSync ? 600 : 0',
    },
  },
  { event: 'users/run-user-sync-jobs' },
  handler
);
