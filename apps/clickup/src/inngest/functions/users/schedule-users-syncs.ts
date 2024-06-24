import { env } from '@/common/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'clickup-schedule-users-syncs' },
  { cron: env.CLICKUP_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        accessToken: Organisation.accessToken,
        region: Organisation.region,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id }) => ({
          name: 'clickup/users.start_sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
            isFirstSync: true
          },
        }))
      );
    }

    return { organisations };
  }
);
