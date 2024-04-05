import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { getOrganisationsToSync } from '../common/data';

export const scheduleAppsSync = inngest.createFunction(
  { id: 'dropbox-schedule-apps-syncs' },
  { cron: env.DROPBOX_THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await getOrganisationsToSync();
    const syncStartedAt = Date.now();
    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-apps',
        organisations.map(({ organisationId }) => ({
          name: 'dropbox/third_party_apps.sync_page.requested',
          data: { organisationId, isFirstSync: false, syncStartedAt },
        }))
      );
    }
    return { organisations };
  }
);
