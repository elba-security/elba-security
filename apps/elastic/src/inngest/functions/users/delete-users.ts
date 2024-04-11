import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  {
    id: 'delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'elastic/users.delete.requested' },
  async ({ event }) => {
    const { userIds, organisationId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
        accountId: Organisation.accountId,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userIds}`);
    }
    const apiKey = await decrypt(organisation.apiKey);
    const accountId = organisation.accountId;

    await deleteUsers({
      userIds,
      accountId,
      apiKey,
    });
  }
);
