import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'openai-schedule-users-syncs', retries: 5 },
  { cron: env.OPENAI_USERS_SYNC_CRON },
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
          name: 'openai/users.sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
            isFirstSync: false,
          },
        }))
      );
    }

    return { organisations };
  }
);
