import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteAircallUser } from '@/connectors/aircall/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';

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
    const { userId, organisationId } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id =${organisationId}`
        );
      }

      await deleteAircallUser({
        userId,
        token: credentials.access_token,
      });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
