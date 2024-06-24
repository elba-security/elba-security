import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSync = inngest.createFunction(
  {
    id: 'salesforce-schedule-users-syncs',
    retries: 5,
  },
  { cron: env.SALESFORCE_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
        region: organisationsTable.region,
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
        instanceUrl: organisationsTable.instanceUrl,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-users',
        organisations.map(({ id }) => ({
          name: 'salesforce/users.sync.requested',
          data: {
            isFirstSync: false,
            organisationId: id,
            syncStartedAt: Date.now(),
            page: 0,
          },
        }))
      );
    }

    return { organisations };
  }
);
