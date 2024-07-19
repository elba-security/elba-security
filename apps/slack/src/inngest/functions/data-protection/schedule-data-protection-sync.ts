import { env } from '@/common/env';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleDataProtectionSync = inngest.createFunction(
  { id: 'slack-schedule-data-protection-sync', retries: 5 },
  { cron: env.DATA_PROTECTION_SYNC_CRON },
  async ({ step }) => {
    const teams = await step.run('get-teams', async () => {
      return db.query.teamsTable.findMany({
        columns: {
          id: true,
        },
      });
    });

    if (teams.length) {
      await step.sendEvent(
        'start-data-protection-sync',
        teams.map(({ id: teamId }) => ({
          name: 'slack/conversations.sync.requested',
          data: {
            teamId,
            isFirstSync: false,
            syncStartedAt: new Date().toISOString(),
          },
        }))
      );
    }

    return { teams };
  }
);
