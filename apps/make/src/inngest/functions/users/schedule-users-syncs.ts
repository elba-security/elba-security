import { env } from '@/common/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'make-schedule-users-syncs' },
  { cron: env.MAKE_USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        token: Organisation.token,
        zoneDomain: Organisation.zoneDomain,
        region: Organisation.region,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id }) => ({
          name: 'make/users.sync.requested',
          data: {
            organisationId: id,
            syncStartedAt: Date.now(),
          },
        }))
      );
    }

    return { organisations };
  }
);
