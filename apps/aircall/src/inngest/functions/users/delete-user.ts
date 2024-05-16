import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteAircallUser } from '@/connectors/aircall/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'aircall-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.AIRCALL_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'aircall/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'aircall/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'aircall/users.delete.requested' },
  async ({ event }) => {
    const { userId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
      })
      .from(organisationsTable);
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const decryptToken = await decrypt(organisation.token);

    await deleteAircallUser({
      userId,
      token: decryptToken,
    });
  }
);
