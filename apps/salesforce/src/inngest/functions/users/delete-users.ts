import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSalesforceUser } from '@/connectors/salesforce/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { credentialsRawSchema } from './sync-users';

export const deleteUser = inngest.createFunction(
  {
    id: 'salesforce-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SALESFORCE_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'salesforce/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesforce/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    if (!('instance_url' in credentials.raw)) {
      throw new Error('Could not retrieve Nango credentials');
    }

    const rawData = credentialsRawSchema.safeParse(credentials.raw);

    if (!rawData.success) {
      throw new NonRetriableError(`Nango credentials.raw is invalid`);
    }

    await deleteSalesforceUser({
      userId,
      accessToken: credentials.access_token,
      instanceUrl: credentials.raw.instance_url as string,
    });
  }
);
