import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  {
    id: 'gitlab-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 5,
    },
    cancelOn: [
      {
        event: 'gitlab/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'gitlab/users.delete.requested' },
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

    await deleteUser({
      userId,
      accessToken,
    });
  }
);
