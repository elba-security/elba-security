import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteRampUser } from '@/connectors/ramp/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'ramp-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.RAMP_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'ramp/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    await deleteRampUser({ userId, accessToken: credentials.access_token });
  }
);
