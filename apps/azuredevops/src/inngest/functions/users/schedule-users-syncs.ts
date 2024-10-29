import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  {
    id: 'azuredevops-schedule-users-syncs',
    retries: 5,
  },
  { cron: env.AZUREDEVOPS_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-users',
        organisations.map(({ id }) => ({
          name: 'azuredevops/users.sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
            isFirstSync: true,
            page: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
