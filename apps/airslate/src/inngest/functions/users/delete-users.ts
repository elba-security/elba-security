import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteAirslateUser } from '@/connectors/airslate/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'airslate-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.AIRSLATE_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'airslate/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const accessToken = await decrypt(organisation.token);
    const workspaceId = organisation.workspaceId;

    await deleteAirslateUser({ userId, accessToken, workspaceId });
  }
);
