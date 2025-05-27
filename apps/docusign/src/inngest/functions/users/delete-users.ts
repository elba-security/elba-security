import { inngest } from '@/inngest/client';
import { deleteUsers as deleteDocusignUsers } from '@/connectors/docusign/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
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
    const { nangoConnectionId, userIds } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    const { apiBaseUri, accountId } = await getAuthUser(credentials.access_token);

    await deleteDocusignUsers({
      accessToken: credentials.access_token,
      apiBaseUri,
      users: userIds.map((userId) => ({ userId })),
      accountId,
    });
  }
);
