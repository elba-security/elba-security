import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSalesloftUser } from '@/connectors/salesloft/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';

export const deleteUser = inngest.createFunction(
  {
    id: 'salesloft-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SALESLOFT_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'salesloft/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'salesloft/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesloft/users.delete.requested' },
  async ({ event }) => {
    const { organisationId, userId } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id =${organisationId}`
        );
      }

      await deleteSalesloftUser({
        userId,
        accessToken: credentials.access_token,
      });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
