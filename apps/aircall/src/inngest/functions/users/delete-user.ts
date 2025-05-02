import { inngest } from '@/inngest/client';
import { deleteUser as deleteAircallUser } from '@/connectors/aircall/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'aircall-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.AIRCALL_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'aircall/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'aircall/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'aircall/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deleteAircallUser({
      userId,
      token: credentials.access_token,
    });
  }
);
