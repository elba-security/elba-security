import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { db } from '@/database/client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'confluence-schedule-users-syncs' },
  { cron: env.DATA_PROTECTION_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'request-users-syncs',
        organisations.map(({ id }) => ({
          name: 'confluence/users.sync.requested',
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            cursor: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
