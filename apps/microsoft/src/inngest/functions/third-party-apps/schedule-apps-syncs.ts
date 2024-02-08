import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { db } from '@/database/client';

export const scheduleAppsSyncs = inngest.createFunction(
  { id: 'microsoft-schedule-apps-syncs' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'request-apps-syncs',
        organisations.map(({ id }) => ({
          name: 'microsoft/third_party_apps.sync.requested',
          data: {
            organisationId: id,
            isFirstSync: false,
            skipToken: null,
            syncStartedAt: Date.now(),
          },
        }))
      );
    }

    return { organisations };
  }
);
