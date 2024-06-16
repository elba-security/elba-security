import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteLinearUser } from '@/connectors/linear/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'linear-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.LINEAR_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'linear/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'linear/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'linear/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);

    await deleteLinearUser({
      userId,
      accessToken,
    });
  }
);
