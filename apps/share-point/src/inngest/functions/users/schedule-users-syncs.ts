import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'share-point-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
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
          name: 'share-point/users.sync.triggered',
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            skipToken: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
