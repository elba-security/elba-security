import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSendgridUser } from '@/connectors/sendgrid/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'sendgrid-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SENDGRID_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'sendgrid/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const apiKey = await decrypt(organisation.apiKey);

    await deleteSendgridUser({
      userId,
      apiKey,
    });
  }
);
