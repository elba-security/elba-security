import { inngest } from '@/common/clients/inngest';
import { getOrganisationsToSyncUsers } from './data';

export const scheduleUserSyncJobs = inngest.createFunction(
  { id: 'schedule-user-sync-jobs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const organisations = await getOrganisationsToSyncUsers();

    if (organisations.length > 0) {
      await step.sendEvent(
        'run-user-sync-jobs',
        organisations.map((organisation) => ({
          name: 'users/run-user-sync-jobs',
          data: { ...organisation, isFirstScan: false },
        }))
      );
    }
    return { organisations };
  }
);
