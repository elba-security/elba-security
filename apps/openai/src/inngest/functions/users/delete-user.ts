import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as usersConnector from '@/connectors/openai/users';
import { env } from '@/env';
import { inngest } from '../../client';

export const deleteUser = inngest.createFunction(
  {
    id: 'openai-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.OPENAI_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'openai/app.installed',
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
