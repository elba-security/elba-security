import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { inngest } from '../../client';

export const scheduleAppsSyncs = inngest.createFunction(
  { id: 'schedule-third-party-apps-syncs' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        installationId: Organisation.installationId,
        accountLogin: Organisation.accountLogin,
      })
      .from(Organisation);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-apps',
        organisations.map(({ id, installationId, accountLogin }) => ({
          name: 'third-party-apps/page_sync.requested',
          data: {
            installationId,
            organisationId: id,
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
