import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteCalendlyUser } from '@/connectors/calendly/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';

export const deleteUser = inngest.createFunction(
  {
    id: 'calendly-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.CALENDLY_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'calendly/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id =${organisationId}`
        );
      }

      const accessToken = credentials.access_token;

      await deleteCalendlyUser({ userId, accessToken });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
