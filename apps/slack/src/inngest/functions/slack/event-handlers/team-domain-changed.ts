import { eq } from 'drizzle-orm';
import { teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const teamDomainChangedHandler: SlackEventHandler<'team_domain_changed'> = async (
  { team_id: teamId, event: { url } },
  { step }
) => {
  const [team] = await db
    .update(teamsTable)
    .set({
      url,
    })
    .where(eq(teamsTable.id, teamId))
    .returning({
      elbaOrganisationId: teamsTable.elbaOrganisationId,
    });

  if (!team) {
    throw new Error("Couldn't find team");
  }

  // We need to update every objects url
  await step.sendEvent('synchronize-conversations', {
    name: 'slack/conversations.sync.requested',
    data: {
      organisationId: team.elbaOrganisationId,
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Team domain changed', teamId, url };
};
