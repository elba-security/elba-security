import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'cloudflare-schedule-users-syncs' },
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
          name: 'cloudflare/users.page_sync.requested',
          data: {
            organisationId: id,
            region,
            syncStartedAt: Date.now(),
            isFirstSync: false,
            page: 1,
          },
        }))
      );
    }

    return { organisations };
  }
);
