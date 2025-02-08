import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSumologicUser } from '@/connectors/sumologic/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'sumologic-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SUMOLOGIC_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sumologic/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sumologic/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sumologic/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessId: organisationsTable.accessId,
        accessKey: organisationsTable.accessKey,
        sourceRegion: organisationsTable.sourceRegion,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const accessId = await decrypt(organisation.accessId);

    await deleteSumologicUser({
      userId,
      accessId,
      accessKey: organisation.accessKey,
      sourceRegion: organisation.sourceRegion,
    });
  }
);
