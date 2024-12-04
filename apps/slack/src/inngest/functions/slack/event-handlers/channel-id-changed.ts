import { and, eq } from 'drizzle-orm';
import { conversationsTable, teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelIdChangedHandler: SlackEventHandler<'channel_id_changed'> = async (
  { team_id: teamId, event: { new_channel_id: newChannelId, old_channel_id: oldChannelId } },
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
      id: newChannelId,
    })
    .where(and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, oldChannelId)));

  // We need to trigger full scan as data protection ids will change
  // meaning data protection object won't be updated but created again
  // so we will need to delete old object ids
  await step.sendEvent('synchronize-conversations', {
    name: 'slack/conversations.sync.requested',
    data: {
      organisationId: team.elbaOrganisationId,
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Channel id changed', teamId, oldChannelId, newChannelId };
};
