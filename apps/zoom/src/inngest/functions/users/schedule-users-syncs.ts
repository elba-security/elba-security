import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  {
    id: 'zoom-schedule-users-syncs',
    cancelOn: [
      {
        event: 'zoom/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
        region: organisationsTable.region,
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'synchronize-users',
        organisations.map(({ id }) => ({
          name: 'zoom/users.sync.requested',
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
