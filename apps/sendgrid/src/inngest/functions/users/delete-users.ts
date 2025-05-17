import { inngest } from '@/inngest/client';
import { deleteUser as deleteSendgridUser } from '@/connectors/sendgrid/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'sendgrid-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SENDGRID_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sendgrid/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sendgrid/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sendgrid/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');

    await deleteSendgridUser({
      userId,
      apiKey: credentials.apiKey,
    });
  }
);
