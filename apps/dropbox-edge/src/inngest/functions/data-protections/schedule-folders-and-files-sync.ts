import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleDataProtectionSync = inngest.createFunction(
  { id: 'dropbox-schedule-data-protection-sync' },
  { cron: env.DROPBOX_DATA_PROTECTION_SYNC_CRON },
  async ({ step }) => {
    const syncStartedAt = Date.now();
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'start-shared-link-sync',
        organisations.map(({ id: organisationId }) => ({
          name: 'dropbox/data_protection.shared_links.start.sync.requested',
          data: {
            organisationId,
            isFirstSync: false,
            syncStartedAt,
            cursor: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
