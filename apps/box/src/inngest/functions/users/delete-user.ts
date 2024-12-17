import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteBoxUser } from '@/connectors/box/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'box-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.BOX_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'box/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    await deleteBoxUser({
      userId,
      accessToken: credentials.access_token,
    });
  }
);
