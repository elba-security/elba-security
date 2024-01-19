import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
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
    .update(conversations)
    .set({
      name: channelName,
      // TODO: update last synced at?
    })
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, channelId)));

  await step.sendEvent('synchronize-conversation-messages', {
    name: 'conversations/synchronize.messages',
    data: {
      teamId,
      conversationId: channelId,
      isFirstSync: false,
    },
  });

  return { message: 'Channel renamed', teamId, channelId, channelName };
};
