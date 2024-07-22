import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteDatadogUser } from '@/connectors/datadog/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'datadog-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DATADOG_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'datadog/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'datadog/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'datadog/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        appKey: organisationsTable.appKey,
        sourceRegion: organisationsTable.sourceRegion,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const apiKey = await decrypt(organisation.apiKey);

    await deleteDatadogUser({
      userId,
      apiKey,
      appKey: organisation.appKey,
      sourceRegion: organisation.sourceRegion,
    });
  }
);
