import { and, eq } from 'drizzle-orm';
import { conversationsTable, teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelDeletedHandler: SlackEventHandler<'channel_deleted'> = async (
  { team_id: teamId, event: { channel: channelId } },
  { step }
) => {
  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.id, teamId),
    columns: { elbaOrganisationId: true },
  });

  if (!team) {
    throw new Error("Couldn't find team");
  }

  await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, channelId)));

  await step.sendEvent('synchronize-conversations', {
    name: 'slack/conversations.sync.requested',
    data: {
      organisationId: team.elbaOrganisationId,
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Channel deleted', teamId, channelId };
};
