import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleDataProtectionSync = inngest.createFunction(
  { id: 'google-schedule-data-protection-sync', retries: 5 },
  { cron: env.DATA_PROTECTION_SYNC_CRON },
  async ({ step }) => {
    const organisationIds = await step.run('get-organisations', async () => {
      const organisations = await db.query.organisationsTable.findMany({ columns: { id: true } });
      return organisations.map(({ id }) => id);
    });

    if (organisationIds.length) {
      await step.sendEvent(
        'start-data-protection-sync',
        organisationIds.map((organisationId) => ({
          name: 'google/data_protection.sync.requested',
          data: {
            organisationId,
            isFirstSync: false,
            syncStartedAt: new Date().toISOString(),
            pageToken: null,
          },
        }))
      );
    }

    return { organisationIds };
  }
);
