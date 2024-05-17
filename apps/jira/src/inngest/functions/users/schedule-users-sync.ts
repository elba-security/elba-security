import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleUsersSync = inngest.createFunction(
  {
    id: 'jira-schedule-users-syncs',
    cancelOn: [
      {
        event: 'jira/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'jira/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { cron: env.JIRA_USERS_SYNC_CRON },
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
          name: 'jira/users.sync.requested',
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
