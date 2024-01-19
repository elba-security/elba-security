import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleUsersSync = inngest.createFunction(
  { id: 'schedule-users-sync', retries: 5 },
  { cron: 'TZ=Europe/Paris 0 0 * * *' },
  async ({ step }) => {
    const teams = await db.query.teams.findMany({
      columns: {
        id: true,
      },
    });

    if (teams.length) {
      const syncStartedAt = new Date().toISOString();
      await step.sendEvent(
        'start-users-sync',
        teams.map(({ id: teamId }) => ({
          name: 'users/synchronize',
          data: {
            teamId,
            isFirstSync: false,
            syncStartedAt,
          },
        }))
      );
    }

    return { teams };
  }
);
