import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { env } from '@/common/env';
import { inngest } from '../client';

export const scheduleThirdPartyAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const orgs = await db
      .select({
        tenantId: organizations.tenantId,
      })
      .from(organizations);

    if (orgs.length > 0) {
      await step.sendEvent(
        'start-third-party-apps-scan',
        orgs.map(({ tenantId }) => ({
          name: 'third-party-apps/start',
          data: { tenantId, isFirstScan: false },
        }))
      );
    }
    return { status: 'scheduled' };
  }
);
