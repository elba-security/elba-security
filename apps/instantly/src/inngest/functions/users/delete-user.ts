import { inngest } from '@/inngest/client';
import { deleteUser as deleteSourceUser } from '@/connectors/instantly/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'instantly-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.INSTANTLY_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'instantly/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'instantly/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'instantly/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');

    await deleteSourceUser({
      userId,
      apiKey: credentials.apiKey,
    });
  }
);
