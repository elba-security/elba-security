import { inngest } from '@/inngest/client';
import { suspendUser as suspendZendeskUser } from '@/connectors/zendesk/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'zendesk-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ZENDESK_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'zendesk/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'zendesk/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'zendesk/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }
    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);
    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    await suspendZendeskUser({
      userId,
      accessToken: credentials.access_token,
      subDomain: nangoConnectionConfigResult.data.subdomain,
    });
  }
);
