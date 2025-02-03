import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteHarvestUser } from '@/connectors/harvest/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'harvest-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.HARVEST_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'harvest/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'harvest/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'harvest/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    await deleteHarvestUser({
      userId,
      accessToken: credentials.access_token,
    });
  }
);
