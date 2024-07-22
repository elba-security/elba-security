import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deletePipedriveUser } from '@/connectors/pipedrive/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'pipedrive-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.PIPEDRIVE_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'pipedrive/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'pipedrive/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'pipedrive/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        apiDomain: organisationsTable.apiDomain,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${organisationId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);

    await deletePipedriveUser({
      userId,
      accessToken,
      apiDomain: organisation.apiDomain,
    });
  }
);
