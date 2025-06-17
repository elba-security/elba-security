import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleUsersSync = inngest.createFunction(
  { id: 'outlook-schedule-users-sync', retries: 5 },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisationIds = await step.run('get-organisations', async () => {
      const organisations = await db.query.organisationsTable.findMany({ columns: { id: true } });
      return organisations.map(({ id }) => id);
    });

    if (organisationIds.length) {
      await step.sendEvent(
        'start-users-sync',
        organisationIds.map((organisationId) => ({
          name: 'outlook/users.sync.requested',
          data: {
            organisationId,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            skipToken: null,
          },
        }))
      );
    }

    return { organisationIds };
  }
);
