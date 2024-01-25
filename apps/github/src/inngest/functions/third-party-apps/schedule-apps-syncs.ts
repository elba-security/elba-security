import { env } from '@/env';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { inngest } from '../../client';

export const scheduleAppsSyncs = inngest.createFunction(
  { id: 'github-schedule-third-party-apps-syncs' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
        installationId: organisationsTable.installationId,
        accountLogin: organisationsTable.accountLogin,
        region: organisationsTable.region,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-apps',
        organisations.map(({ id, installationId, accountLogin, region }) => ({
          name: 'github/third_party_apps.page_sync.requested',
          data: {
            installationId,
            organisationId: id,
            region,
            accountLogin,
            cursor: null,
            syncStartedAt: Date.now(),
            isFirstSync: false,
          },
        }))
      );
    }

    return { organisations };
  }
);
