import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const scheduleAppsSync = inngest.createFunction(
  { id: 'dropbox-schedule-apps-sync' },
  { cron: env.DROPBOX_TPA_SYNC_CRON },
  async ({ step }) => {
    const syncStartedAt = Date.now();
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-apps',
        organisations.map(({ id: organisationId }) => ({
          name: 'dropbox/third_party_apps.sync.requested',
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
