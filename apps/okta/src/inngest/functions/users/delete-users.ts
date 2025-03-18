import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteOktaUser } from '@/connectors/okta/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'okta-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.OKTA_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'okta/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'okta/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'okta/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    await deleteOktaUser({
      userId,
      token: credentials.access_token,
      subDomain: nangoConnectionConfigResult.data.subdomain,
    });
  }
);
