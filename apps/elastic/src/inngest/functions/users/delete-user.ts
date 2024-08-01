import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSourceUser } from '@/connectors/elastic/users';
import { getOrganizationId } from '@/connectors/elastic/organization';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'elastic-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.ELASTIC_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'elastic/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'elastic/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'elastic/users.delete.requested' },
  async ({ event, step }) => {
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
    const decryptedApiKey = await decrypt(organisation.apiKey);

    const { organizationId } = await step.run('get-organization-id', async () => {
      return getOrganizationId({ apiKey: decryptedApiKey });
    });

    await deleteSourceUser({
      userId,
      apiKey: decryptedApiKey,
      organizationId,
    });
  }
);
