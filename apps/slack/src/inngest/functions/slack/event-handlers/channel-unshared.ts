import { and, eq } from 'drizzle-orm';
import { conversationsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelUnsharedHandler: SlackEventHandler<'channel_unshared'> = async (
  { team_id: teamId, event: { channel: channelId, is_ext_shared: isSharedExternally } },
  { step }
) => {
  await db
    .update(conversationsTable)
    .set({
      isSharedExternally,
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

  return { message: 'Channel unshared', teamId, channelId, isSharedExternally };
};
