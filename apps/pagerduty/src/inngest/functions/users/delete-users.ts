import { inngest } from '@/inngest/client';
import { deleteUser as deletePagerdutyUser } from '@/connectors/pagerduty/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'pagerduty-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.PAGERDUTY_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'pagerduty/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await deletePagerdutyUser({ userId, accessToken: credentials.access_token });
  }
);
