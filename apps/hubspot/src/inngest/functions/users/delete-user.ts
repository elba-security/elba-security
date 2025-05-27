import { inngest } from '@/inngest/client';
import { deleteUser as deleteHubspotUser } from '@/connectors/hubspot/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'hubspot-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.HUBSPOT_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'hubspot/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'hubspot/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'hubspot/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deleteHubspotUser({
      userId,
      accessToken: credentials.access_token,
    });
  }
);
