import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteHubspotUser } from '@/connectors/hubspot/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'hubspot-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.HUBSPOT_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'hubspot/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'hubspot/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'hubspot/users.delete.requested' },
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

    await deleteHubspotUser({
      userId,
      accessToken,
    });
  }
);
