import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSynchronize = inngest.createFunction(
  { id: 'schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        region: Organisation.region,
        token: Organisation.token,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'synchronize-users',
        organisations.map(({ id }) => ({
          name: 'yousign/users.sync.requested',
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
