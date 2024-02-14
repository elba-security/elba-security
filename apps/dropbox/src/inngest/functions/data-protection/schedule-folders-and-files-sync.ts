import { inngest } from '@/inngest/client';
import { getOrganisationsToSync } from '../common/data';

export const scheduleDataProtectionSyncJobs = inngest.createFunction(
  { id: 'dropbox-schedule-folders-and-files-sync' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const syncStartedAt = Date.now();
    const organisations = await getOrganisationsToSync();
    if (organisations.length > 0) {
      await step.sendEvent(
        'dropbox-create-sync-shared-link-page',
        organisations.map(({ organisationId }) => ({
          name: 'dropbox/data_protection.shared_link.create.sync_page.requested',
          data: {
            organisationId,
            isFirstSync: false,
            syncStartedAt,
          },
        }))
      );
    }

    return { organisations };
  }
);
