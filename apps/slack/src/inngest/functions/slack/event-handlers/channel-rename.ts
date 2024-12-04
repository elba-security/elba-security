import { and, eq } from 'drizzle-orm';
import { conversationsTable, teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelRenameHandler: SlackEventHandler<'channel_rename'> = async (
  {
    team_id: teamId,
    event: {
      channel: { id: channelId, name: channelName },
    },
  },
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
    .update(conversationsTable)
    .set({
      name: channelName,
      lastSyncedAt: new Date(),
    })
    .where(and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, channelId)));

  await step.sendEvent('synchronize-conversation-messages', {
    name: 'slack/conversations.sync.messages.requested',
    data: {
      organisationId: team.elbaOrganisationId,
      teamId,
      conversationId: channelId,
      isFirstSync: false,
    },
  });

  return { message: 'Channel renamed', teamId, channelId, channelName };
};
