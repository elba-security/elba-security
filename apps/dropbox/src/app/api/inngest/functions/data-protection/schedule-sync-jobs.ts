import { inngest } from '@/common/clients/inngest';
import { getOrganisationsToSyncJobs } from '../common/data';

export const scheduleDataProtectionSyncJobs = inngest.createFunction(
  { id: 'schedule-data-protection-sync-jobs' },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const now = new Date().toISOString();
    const organisations = await getOrganisationsToSyncJobs();
    if (organisations.length > 0) {
      await step.sendEvent(
        'send-event-create-shared-link-sync-jobs',
        organisations.map(({ accessToken, adminTeamMemberId, organisationId, pathRoot }) => ({
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            accessToken,
            adminTeamMemberId,
            organisationId,
            pathRoot,
            isFirstScan: false,
            syncStartedAt: now,
          },
        }))
      );
    }

    return { organisations };
  }
);
