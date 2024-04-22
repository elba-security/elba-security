import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  {
    id: 'delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'elastic/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        accountId: organisationsTable.accountId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const apiKey = await decrypt(organisation.apiKey);
    const accountId = organisation.accountId;

    await deleteUser({
      userId,
      accountId,
      apiKey,
    });
  }
);
