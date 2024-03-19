import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers } from '@/connectors/users';

export const deleteSourceUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'pagerduty/users.delete.requested' },
  async ({ event }) => {
    const { userId } = event.data;

    const [organisation] = await db
      .select({
        token: Organisation.accessToken,
      })
      .from(Organisation);
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    await deleteUsers({
      userId,
      token: organisation.token,
    });
  }
);
