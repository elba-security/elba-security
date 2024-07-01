import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSync = inngest.createFunction(
  { id: 'livestorm-schedule-users-sync' },
  { cron: env.LIVESTORM_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);
    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id }) => ({
          name: 'livestorm/users.sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
            isFirstSync: false,
            page: null,
          },
        }))
      );
    }
    return { organisations };
  }
);