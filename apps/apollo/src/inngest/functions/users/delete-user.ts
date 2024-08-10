import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteApolloUser } from '@/connectors/apollo/users';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';

export const deleteUser = inngest.createFunction(
  {
    id: 'apollo-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.APOLLO_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'apollo/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'apollo/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'apollo/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const decryptedApiKey = await decrypt(organisation.apiKey);

    await deleteApolloUser({
      userId,
      apiKey: decryptedApiKey,
    });
  }
);
