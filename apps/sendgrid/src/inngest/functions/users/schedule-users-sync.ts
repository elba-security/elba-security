import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleUsersSync = inngest.createFunction(
  { id: 'sendgrid-schedule-users-sync' },
  { cron: env.SENDGRID_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sendgrid-sync-users',
        organisations.map(({ id }) => ({
          name: 'sendgrid/users.sync.requested',
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
