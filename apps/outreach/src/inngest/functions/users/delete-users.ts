import { inngest } from '@/inngest/client';
import { deleteUser as deleteOutreachUser } from '@/connectors/outreach/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'outreach-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.OUTREACH_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'outreach/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deleteOutreachUser({ userId, accessToken: credentials.access_token });
  }
);
