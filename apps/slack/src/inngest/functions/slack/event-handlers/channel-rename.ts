import { and, eq } from 'drizzle-orm';
import { conversationsTable } from '@/database/schema';
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
      teamId,
      conversationId: channelId,
      isFirstSync: false,
    },
  });

  return { message: 'Channel renamed', teamId, channelId, channelName };
};
