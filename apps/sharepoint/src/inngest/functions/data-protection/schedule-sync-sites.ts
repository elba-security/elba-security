import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';

export const scheduleDataProtectionSyncJobs = inngest.createFunction(
  { id: 'sharepoint-schedule-data-protection-sync' },
  { cron: env.MICROSOFT_DATA_PROTECTION_CRON_SYNC },
  async ({ step }) => {
    const syncStartedAt = Date.now();
    const organisations = await db.select({ id: organisationsTable.id }).from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'start-sync-sites',
        organisations.map(({ id }) => ({
          name: 'sharepoint/data_protection.sync.requested',
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt,
            skipToken: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
