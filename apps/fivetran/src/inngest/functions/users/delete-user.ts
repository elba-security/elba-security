import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteFivetranUser } from '@/connectors/fivetran/users';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';

export const deleteUser = inngest.createFunction(
  {
    id: 'fivetran-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.FIVETRAN_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'fivetran/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'fivetran/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
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

    await deleteFivetranUser({
      userId,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
    });
  }
);
