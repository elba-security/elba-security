import { inngest } from '@/inngest/client';
import { deleteUser as deleteApolloUser } from '@/connectors/apollo/users';
import { env } from '@/common/env';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'apollo-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.APOLLO_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'apollo/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    await deleteApolloUser({
      userId,
      apiKey: nangoCredentialsResult.data.apiKey,
    });
  }
);
