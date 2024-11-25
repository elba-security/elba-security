import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUsers as deleteDocusignUsers } from '@/connectors/docusign/users';
import { env } from '@/common/env/server';
import { nangoAPIClient } from '@/common/nango/api';
import { getAuthUser } from '@/connectors/docusign/auth';

export const deleteUsers = inngest.createFunction(
  {
    id: 'docusign-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DOCUSIGN_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'docusign/users.delete.requested' },
  async ({ event }) => {
    const { organisationId, userIds } = event.data;

    try {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const { apiBaseUri, accountId } = await getAuthUser(credentials.access_token);

      await deleteDocusignUsers({
        accessToken: credentials.access_token,
        apiBaseUri,
        users: userIds.map((userId) => ({ userId })),
        accountId,
      });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
