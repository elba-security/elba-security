import { inngest } from '@/common/clients/inngest';
import { getOrganisationsToSyncUsers } from '../users/data';

export const scheduleThirdPartyAppsSyncJobs = inngest.createFunction(
  { id: 'schedule-third-party-apps-sync-jobs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const syncStartedAt = new Date().toISOString();
    const organisations = await getOrganisationsToSyncUsers();
    if (organisations.length > 0) {
      await step.sendEvent(
        'run-third-party-apps-sync-jobs',
        organisations.map((organisation) => ({
          name: 'third-party-apps/run-sync-jobs',
          data: { ...organisation, isFirstScan: false, syncStartedAt },
        }))
      );
    }

    return { organisations };
  }
);
