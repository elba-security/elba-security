import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'heroku-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db.select({ id: organisationsTable.id }).from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id }) => ({
          name: 'heroku/users.sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
            isFirstSync: false,
            cursor: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
