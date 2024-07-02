import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { deleteUser as deleteLivestormUser } from '@/connectors/livestorm/users';

export const deleteUser = inngest.createFunction(
  {
    id: 'livestorm-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.LIVESTORM_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'livestorm/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'livestorm/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'livestorm/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const token = await decrypt(organisation.token);

    await deleteLivestormUser({
      token,
      userId,
    });
  }
);
