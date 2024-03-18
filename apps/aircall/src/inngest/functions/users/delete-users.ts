import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers } from '@/connectors/users';
import { decrypt } from '@/app/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'aircall/users.delete.requested' },
  async ({ event }) => {
    const { userId } = event.data;

    const [organisation] = await db
      .select({
        token: Organisation.accessToken,
      })
      .from(Organisation)
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const decryptToken = await decrypt(organisation.token)
    const result = await deleteUsers({
      userId,
      token: decryptToken,
    });

    return result;
  }
);
