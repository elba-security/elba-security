import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/users';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';

export const deleteSourceUser = inngest.createFunction(
  {
    id: 'fivetran-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.FIVETRAN_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'fivetran/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        apiSecret: organisationsTable.apiSecret,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const decryptedApiKey = await decrypt(organisation.apiKey);
    const decryptedApiSecret = await decrypt(organisation.apiSecret);

    await deleteUser({
      userId,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
    });
  }
);
