import { inngest } from '@/inngest/client';
import { suspendUser } from '@/connectors/dropbox/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'dropbox-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DROPBOX_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'dropbox/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await suspendUser({
      accessToken: credentials.access_token,
      teamMemberId: userId,
    });
  }
);
