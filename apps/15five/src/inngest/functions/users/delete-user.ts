import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteFifteenfiveUser } from '@/connectors/fifteenfive/users';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';

export const deleteUser = inngest.createFunction(
  {
    id: 'fifteenfive-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.FIFTEENFIVE_USERS_DELETE_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'fifteenfive/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(
        `API key & Secret not found for organisation with ID: ${organisationId} for the user id ${userId}`
      );
    }

    const decryptedToken = await decrypt(organisation.apiKey);

    await deleteFifteenfiveUser({
      userId,
      apiKey: decryptedToken,
    });
  }
);
