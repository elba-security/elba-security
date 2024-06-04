import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleUsersSync = inngest.createFunction(
  {
    id: 'intercom-schedule-users-syncs',
    cancelOn: [
      {
        event: 'intercom/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'intercom/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { cron: env.INTERCOM_USERS_SYNC_CRON },
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
          name: 'intercom/users.sync.requested',
          data: {
            isFirstSync: false,
            organisationId: id,
            syncStartedAt: Date.now(),
            page: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
