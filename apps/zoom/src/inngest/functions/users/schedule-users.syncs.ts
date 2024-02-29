import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'request-organisations-users-sync' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        region: Organisation.region,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-users-page',
        organisations.map(({ id, region }) => ({
          name: 'zoom/users.page_sync.requested',
          data: {
            organisationId: id,
            region,
            cursor: null,
            syncStartedAt: Date.now(),
            isFirstSync: false,
            page: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
