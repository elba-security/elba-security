import { inngest } from '@/inngest/client';
import { deactivateUser } from '@/connectors/zoom/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'zoom-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ZOOM_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'zoom/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'zoom/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'zoom/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deactivateUser({
      userId,
      accessToken: credentials.access_token,
    });
  }
);
