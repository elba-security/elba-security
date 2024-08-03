import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSync = inngest.createFunction(
  {
    id: 'apollo-schedule-users-syncs',
  },
  { cron: env.APOLLO_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'synchronize-users',
        organisations.map(({ id }) => ({
          name: 'apollo/users.sync.requested',
          data: {
            isFirstSync: false,
            organisationId: id,
            syncStartedAt: Date.now(),
            page: 1,
          },
        }))
      );
    }

    return { organisations };
  }
);
