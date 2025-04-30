import { inngest } from '@/inngest/client';
import { deleteUser as deleteLinearUser } from '@/connectors/linear/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'linear-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.LINEAR_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'linear/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'linear/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'linear/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deleteLinearUser({
      userId,
      accessToken: credentials.access_token,
    });
  }
);
