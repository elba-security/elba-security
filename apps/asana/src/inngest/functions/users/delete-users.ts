import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteAsanaUser } from '@/connectors/asana/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';
import { getWorkspaceIds } from '@/connectors/asana/auth';

export const deleteUser = inngest.createFunction(
  {
    id: 'asana-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ASANA_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'asana/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'asana/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'asana/users.delete.requested' },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const accessToken = credentials.access_token;
      const workspaceIds = await step.run('get-workspace-ids', async () => {
        return getWorkspaceIds(accessToken);
      });

      await Promise.all(
        workspaceIds.map(async (workspaceId) =>
          step.run(`delete-user-from-workspace-${workspaceId}`, async () =>
            deleteAsanaUser({
              userId,
              workspaceId,
              accessToken,
            })
          )
        )
      );
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
