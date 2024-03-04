import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { db } from '@/database/client';

export const scheduleDataProtectionSyncs = inngest.createFunction(
  { id: 'confluence-schedule-data-protections-syncs' },
  { cron: env.DATA_PROTECTION_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'request-data-protection-syncs',
        organisations.map(({ id }) => ({
          name: 'confluence/data_protection.spaces.sync.requested',
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            cursor: null,
            type: 'global',
          },
        }))
      );
    }

    return { organisations };
  }
);
