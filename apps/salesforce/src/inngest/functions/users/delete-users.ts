import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSalesforceUser } from '@/connectors/salesforce/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';

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
    const { userId, organisationId } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id =${organisationId}`
        );
      }

      const instanceUrl = credentials.raw.instance_url as string;

      await deleteSalesforceUser({
        userId,
        accessToken: credentials.access_token,
        instanceUrl,
      });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
