import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleThirdPartyAppsSync = inngest.createFunction(
  { id: 'google-schedule-third-party-apps-sync', retries: 5 },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisationIds = await step.run('get-organisations', async () => {
      const organisations = await db.query.organisationsTable.findMany({ columns: { id: true } });
      return organisations.map(({ id }) => id);
    });

    if (organisationIds.length) {
      await step.sendEvent(
        'start-third-party-apps-sync',
        organisationIds.map((organisationId) => ({
          name: 'google/third_party_apps.sync.requested',
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
