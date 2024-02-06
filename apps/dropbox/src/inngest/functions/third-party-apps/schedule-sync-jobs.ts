import { inngest } from '@/inngest/client';
import { getOrganisationsToSync } from '../common/data';

export const scheduleThirdPartyAppsSyncJobs = inngest.createFunction(
  { id: 'schedule-third-party-apps-sync-jobs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const organisations = await getOrganisationsToSync();
    const syncStartedAt = new Date().toISOString();
    if (organisations.length > 0) {
      await step.sendEvent(
        'run-third-party-apps-sync-jobs',
        organisations.map(({ organisationId }) => ({
          name: 'third-party-apps/run-sync-jobs',
          data: { organisationId, isFirstSync: false, syncStartedAt },
        }))
      );
    }
    return { organisations };
  }
);
