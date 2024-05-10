import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteSegmentUser } from '@/connectors/segment/users';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';

export const deleteUser = inngest.createFunction(
  {
    id: 'segment-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SEGMENT_USERS_DELETE_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'segment/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(
        `API key & Secret not found for organisation with ID: ${organisationId} for the user id ${userId}`
      );
    }

    const decryptedToken = await decrypt(organisation.token);

    await deleteSegmentUser({
      userId,
      token: decryptedToken,
    });
  }
);
