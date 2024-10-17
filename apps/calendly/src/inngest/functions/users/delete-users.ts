import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db, tables } from '@/database/client';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteCalendlyUser } from '@/connectors/calendly/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'calendly-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.CALENDLY_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'calendly/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: tables.organisationsTable.accessToken,
      })
      .from(tables.organisationsTable)
      .where(eq(tables.organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const accessToken = await decrypt(organisation.token);

    await deleteCalendlyUser({ userId, accessToken });
  }
);
