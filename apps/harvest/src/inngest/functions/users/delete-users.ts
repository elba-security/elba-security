import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteHarvestUser } from '@/connectors/harvest/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getAccountIds } from '@/connectors/harvest/auth';

export const deleteUsers = inngest.createFunction(
  {
    id: 'harvest-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.HARVEST_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'harvest/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'harvest/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'harvest/users.delete.requested' },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${organisationId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);

    const accountIds = await step.run('get-account-ids', async () => {
      return getAccountIds({ accessToken });
    });

    await Promise.all(
      accountIds.map(async (accountId) => {
        await step.run('delete-users-from-account', async () => {
          return deleteHarvestUser({
            userId,
            accountId,
            accessToken,
          });
        });
      })
    );
  }
);
