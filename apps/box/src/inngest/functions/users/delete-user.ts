import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteBoxUser } from '@/connectors/box/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'box-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.BOX_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'box/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const token = await decrypt(organisation.token);

    await deleteBoxUser({
      userId,
      token,
    });
  }
);
