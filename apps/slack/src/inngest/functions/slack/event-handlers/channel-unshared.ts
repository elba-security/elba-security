import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelUnsharedHandler: SlackEventHandler<'channel_unshared'> = async (
  { team_id: teamId, event: { channel: channelId, is_ext_shared: isSharedExternally } },
  { step }
) => {
  await db
    .update(conversations)
    .set({
      isSharedExternally,
      lastSyncedAt: new Date(),
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

  return { message: 'Channel unshared', teamId, channelId, isSharedExternally };
};
