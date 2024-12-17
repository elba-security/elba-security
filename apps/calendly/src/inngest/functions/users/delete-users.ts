import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteCalendlyUser } from '@/connectors/calendly/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

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
    const { userId, nangoConnectionId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    await deleteCalendlyUser({ userId, accessToken: credentials.access_token });
  }
);
