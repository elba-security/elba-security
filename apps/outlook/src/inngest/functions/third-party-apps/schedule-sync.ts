import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleThirdPartyAppsSync = inngest.createFunction(
  { id: 'schedule-third-party-apps-sync', retries: 5 },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await step.run('get-organisations', async () => {
      return await db.query.organisationsTable.findMany({
        columns: {
          id: true,
          lastSyncStartedAt: true,
          region: true,
          tenantId: true,
        },
      });
    });

    if (organisations.length > 0) {
      await step.sendEvent(
        'start-third-party-apps-sync',
        organisations.map((organisation) => ({
          name: 'outlook/third_party_apps.sync.requested',
          data: {
            organisationId: organisation.id,
            region: organisation.region as 'eu' | 'us',
            syncStartedAt: new Date().toISOString(),
            lastSyncStartedAt: organisation.lastSyncStartedAt,
            pageToken: null,
            tenantId: organisation.tenantId,
          },
        }))
      );
    }

    return { organisationIds: organisations.map(({ id }) => id) };
  }
);
