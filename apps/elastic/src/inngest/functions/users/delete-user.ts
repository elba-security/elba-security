import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as usersConnector from '@/connectors/elastic/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'elastic-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ELASTIC_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'elastic/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'elastic/app.installed',
        match: 'data.organisationId',
      },
    ],
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

    await usersConnector.deleteUser({
      userId,
      accountId,
      apiKey,
    });
  }
);
