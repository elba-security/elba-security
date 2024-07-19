import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSourceUser } from '@/connectors/jira/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'jira-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.JIRA_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'jira/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'jira/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'jira/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiToken: organisationsTable.apiToken,
        domain: organisationsTable.domain,
        email: organisationsTable.email,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const apiToken = await decrypt(organisation.apiToken);

    await deleteSourceUser({
      userId,
      apiToken,
      domain: organisation.domain,
      email: organisation.email,
    });
  }
);
