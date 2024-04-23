import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/users';

export const deleteSourceUser = inngest.createFunction(
  {
    id: 'fivetran-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'fivetran/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
        apiSecret: Organisation.apiSecret,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(
        `API key & Secret not found for organisation with ID: ${organisationId} for the user id ${userId}`
      );
    }

    await deleteUser({
      userId,
      apiKey: organisation.apiKey,
      apiSecret: organisation.apiSecret,
    });
  }
);
