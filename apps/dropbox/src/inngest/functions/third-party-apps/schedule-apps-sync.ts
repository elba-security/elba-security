import { inngest } from '@/inngest/client';
import { getOrganisationsToSync } from '../common/data';

export const scheduleAppsSync = inngest.createFunction(
  { id: 'dropbox-schedule-apps-syncs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const organisations = await getOrganisationsToSync();
    const syncStartedAt = Date.now();
    if (organisations.length > 0) {
      await step.sendEvent(
        'dropbox-sync-apps',
        organisations.map(({ organisationId }) => ({
          name: 'dropbox/third_party_apps.sync_page.triggered',
          data: { organisationId, isFirstSync: false, syncStartedAt },
        }))
      );
    }
    return { organisations };
  }
);
