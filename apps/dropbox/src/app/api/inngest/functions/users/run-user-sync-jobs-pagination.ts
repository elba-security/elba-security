import { inngest } from '@/common/clients/inngest';
import { elbaAccess } from '@/common/clients/elba';
import { DBXAccess } from '@/repositories/dropbox/clients';
import { formatElbaUsers } from './utils/format-elba-users';
import { handleError } from '../../handle-error';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  const { organisationId, accessToken, pagination } = event.data;

  const dbxAccess = new DBXAccess({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  const nextPageProps = await step
    .run('user-sync-paginate', async () => {
      const response = await dbxAccess.teamMembersListContinueV2({
        cursor: pagination,
      });

      const {
        result: { members, has_more, cursor },
      } = response;

      // Sent to Elba
      await elba.users.update({
        users: formatElbaUsers(members),
      });

      return {
        nextCursor: cursor,
        hasMore: has_more,
      };
    })
    .catch(handleError);

  if (nextPageProps?.hasMore) {
    await step.sendEvent('sendEvent.run-user-sync-job-pagination', {
      name: 'users/run-user-sync-job-pagination',
      data: { ...event.data, isFirstScan: false, pagination: nextPageProps.nextCursor },
    });
  } else {
    await step.sendEvent('waitForEvent.run-user-sync-job-pagination', {
      name: 'users/run-user-sync-job-pagination.completed',
      data: { organisationId },
    });
  }

  return {
    success: true,
  };
};

export const runUserSyncJobPagination = inngest.createFunction(
  {
    id: 'run-user-sync-job-pagination',
    retries: 6,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  { event: 'users/run-user-sync-job-pagination' },
  handler
);
