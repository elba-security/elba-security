import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleUsersSyncs = inngest.createFunction(
  { id: 'microsoft-schedule-users-syncs' },
  { cron: env.USERS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-organisations-users',
        organisations.map(({ id, tenantId, region }) => ({
          name: 'microsoft/users.sync.triggered',
          data: {
            tenantId,
            organisationId: id,
            region,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            skipToken: null,
          },
        }))
      );
    }

    return { organisations };
  }
);
