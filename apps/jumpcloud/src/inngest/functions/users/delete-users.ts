import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'jumpcloud/users.delete.requested' },
  async ({ event }) => {
    const { userId } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
      })
      .from(Organisation);
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const apiKey = await decrypt(organisation.apiKey);

    await deleteUsers({
      userId,
      apiKey,
    });
  }
);
