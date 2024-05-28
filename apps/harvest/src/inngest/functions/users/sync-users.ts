import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { getAccountIds } from '@/connectors/harvest/auth';
import { syncAccountUsers } from './sync-account-users';

export const syncUsers = inngest.createFunction(
  {
    id: 'harvest-sync-users',
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
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'harvest/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const accountIds = await step.run('list-account-ids', async () =>
      getAccountIds({
        accessToken: await decrypt(organisation.accessToken),
      })
    );
    // sync retrieved accounts users
    await Promise.all(
      accountIds.map((accountId) =>
        step.invoke(`sync-account-users-${accountId}`, {
          function: syncAccountUsers,
          data: {
            isFirstSync: event.data.isFirstSync,
            organisationId,
            cursor: null,
            accountId,
          },
          timeout: '0.5d',
        })
      )
    );

    await step.run('finalize', async () => {
      const elba = createElbaClient({ organisationId, region: organisation.region });
      await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
    });

    return {
      status: 'completed',
    };
  }
);
