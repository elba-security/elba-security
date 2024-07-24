import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as usersConnector from '@/connectors/openai/users';
import { inngest } from '@/inngest/client';

export const deleteUser = inngest.createFunction(
  {
    id: 'openai-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 5,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'openai/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'openai/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'openai/users.delete.requested',
  },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    await usersConnector.deleteUser({
      userId,
      organizationId: organisation.organizationId,
      apiKey: organisation.apiKey,
    });
  }
);
