import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'github-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
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
        'sync-organisations-users',
        organisations.map(({ id, installationId, accountLogin, region }) => ({
          name: 'github/users.page_sync.requested',
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
