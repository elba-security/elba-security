import { inngest } from '@/common/clients/inngest';
import { elbaAccess } from '@/common/clients/elba';
import { DBXAccess } from '@/repositories/dropbox/clients';
import { DropboxResponse, team } from 'dropbox';
import { handleError } from '../../handle-error';
import { formatElbaUsers } from './utils/format-elba-users';

const PAGE_SIZE = 1;

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  if (!event.ts) {
    throw new Error('No timestamp');
  }

  const { organisationId, accessToken, isFirstScan } = event.data;
  const syncStartedAt = new Date(event.ts);

  const dbxAccess = new DBXAccess({
    accessToken,
  });
  const elba = elbaAccess(organisationId);

  let response: DropboxResponse<team.MembersListV2Result>;

  const users = await step
    .run('user-sync-initialize', async () => {
      response = await dbxAccess.teamMembersListV2({
        include_removed: false,
        limit: PAGE_SIZE,
      });

      const {
        result: { members, cursor, has_more: hasMore },
      } = response;

      if (members.length > 0) {
        await elba.users.update({
          users: formatElbaUsers(members),
        });
      }

      // Handle first page
      if (hasMore) {
        return {
          pagination: cursor,
          hasMore,
        };
      }

      await elba.users.delete({
        syncedBefore: syncStartedAt.toISOString(),
      });

      return {
        pagination: cursor,
        hasMore,
      };
    })
    .catch(handleError);

  if (users?.hasMore) {
    await step.sendEvent('sendEvent.run-user-sync-job-pagination', {
      name: 'users/run-user-sync-job-pagination',
      data: { ...event.data, isFirstScan: false, pagination: users.pagination },
    });

    const userSyncCompleted = await step.waitForEvent('waitForEvent.run-user-sync-job-pagination', {
      event: 'users/run-user-sync-job-pagination.completed',
      timeout: '1d',
      match: 'data.organisationId',
    });

    // If it received resolved the event, it means that the sync was completed
    // and we can delete the users that were not found in the last sync.
    // if it is not resolved, it means that the sync is still running and we
    // the event will wait for 3 days before timing out.

    if (userSyncCompleted) {
      await step.run('user-sync-finalize', async () => {
        return await elba.users.delete({
          syncedBefore: syncStartedAt.toISOString(),
        });
      });
    }
  }

  return {
    success: true,
  };
};

export const runUserSyncJobs = inngest.createFunction(
  {
    id: 'run-user-sync-jobs',
    retries: 6,
    rateLimit: {
      limit: 1,
      key: 'event.data.organisationId',
      period: '1m',
    },
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
