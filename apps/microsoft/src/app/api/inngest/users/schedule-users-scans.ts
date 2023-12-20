import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { env } from '@/common/env';
import { inngest } from '../client';

export const scheduleUsersScans = inngest.createFunction(
  { id: 'schedule-users-scans' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const orgs = await db
      .select({
        tenantId: organizations.tenantId,
      })
      .from(organizations);

    if (orgs.length > 0) {
      await step.sendEvent(
        'start-users-scan',
        orgs.map(({ tenantId }) => ({
          name: 'users/start',
          data: { tenantId, isFirstScan: false },
        }))
      );
    }

    return {
      status: 'scheduled',
    };
  }
);
