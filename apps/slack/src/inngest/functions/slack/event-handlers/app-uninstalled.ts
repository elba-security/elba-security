import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { teams } from '@/database/schema';
import { db } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import type { SlackEventHandler } from './types';

export const appUninstalledHandler: SlackEventHandler<'app_uninstalled'> = async (
  { team_id: teamId },
  { step }
) => {
  // We use a step as otherwise on retries the team will be already deleted and we won't get the elba info
  const team = await step.run('delete-team', async () => {
    const [teamInfo] = await db.delete(teams).where(eq(teams.id, teamId)).returning({
      elbaOrganisationId: teams.elbaOrganisationId,
      elbaRegion: teams.elbaRegion,
    });

    return teamInfo;
  });

  if (team) {
    const elbaClient = createElbaClient(team.elbaOrganisationId, team.elbaRegion);
    await elbaClient.connectionStatus.update({ hasError: true });
  }

  logger.info('Slack app uninstalled', { teamId, team });

  return { message: 'App uninstalled', teamId, team };
};
