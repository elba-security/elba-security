import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSynchronize = inngest.createFunction(
  { id: 'gitlab-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
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
          name: 'gitlab/users.sync.triggered',
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
