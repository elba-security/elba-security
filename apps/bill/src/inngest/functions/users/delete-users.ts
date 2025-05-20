import { inngest } from '@/inngest/client';
import { deleteUser as deleteBillUser } from '@/connectors/bill/users';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'bill-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.BILL_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'bill/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'BILL');

    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    await deleteBillUser({
      userId,
      devKey: nangoCredentialsResult.data.dev_key,
      sessionId: nangoCredentialsResult.data.session_id,
    });
  }
);
