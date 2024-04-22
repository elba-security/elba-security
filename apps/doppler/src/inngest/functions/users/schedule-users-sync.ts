import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSynchronize = inngest.createFunction(
  { id: 'doppler-schedule-users-sync' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        region: Organisation.region,
        apiKey: Organisation.apiKey,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'synchronize-users',
        organisations.map(({ id }) => ({
          name: 'doppler/users.sync.requested',
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
