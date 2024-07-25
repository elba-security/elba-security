import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleTeamsSync = inngest.createFunction(
  { id: 'teams-schedule-teams-sync' },
  { cron: env.TEAMS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'sync-schedule-teams',
        organisations.map((organisation) => ({
          name: 'teams/teams.sync.requested',
          data: {
            organisationId: organisation.id,
            syncStartedAt: new Date().toISOString(),
            skipToken: null,
            isFirstSync: true,
          },
        }))
      );
    }

    return { organisations };
  }
);
