import { inngest } from '@/inngest/client';
import { deleteUser as deleteAsanaUser } from '@/connectors/asana/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { getWorkspaceIds } from '@/connectors/asana/workspaces';

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
    const { userId, nangoConnectionId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

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
  }
);
