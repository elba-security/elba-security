import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'bitbucket-schedule-users-syncs' },
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
          name: 'bitbucket/users.sync.requested',
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            nextUrl: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
