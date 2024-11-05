import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getCredentials } from '@elba-security/nango';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers as deleteDocusignUsers } from '@/connectors/docusign/users';
import { env } from '@/common/env';
import { getRequestInfo } from '@/connectors/docusign/request-info';

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

    const [organisation] = await db
      .select({
        connectionId: organisationsTable.connectionId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation`);
    }

    try {
      const { credentials } = await getCredentials(organisation.connectionId);

      if (!credentials) {
        throw new NonRetriableError(`Could not retrieve credentials`);
      }

      const { baseUri, accountId } = await getRequestInfo(
        credentials.access_token,
        env.DOCUSIGN_ROOT_URL
      );

      await deleteDocusignUsers({
        accessToken: credentials.access_token,
        apiBaseUri: baseUri,
        users: userIds.map((userId) => ({ userId })),
        accountId,
      });
    } catch (error: unknown) {
      throw new NonRetriableError(`Could not retrieve credentials or request info`);
    }
  }
);
