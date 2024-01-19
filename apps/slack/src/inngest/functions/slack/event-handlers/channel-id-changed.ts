import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelIdChangedHandler: SlackEventHandler<'channel_id_changed'> = async (
  { team_id: teamId, event: { new_channel_id: newChannelId, old_channel_id: oldChannelId } },
  { step }
) => {
  await db
    .update(conversations)
    .set({
      id: newChannelId,
      // TODO: update last synced at?
    })
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, oldChannelId)));

  // We need to trigger full scan as data protection ids will change
  // meaning data protection object won't be updated but created again
  // so we will need to delete old object ids
  await step.sendEvent('synchronize-conversations', {
    name: 'conversations/synchronize',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Channel id changed', teamId, oldChannelId, newChannelId };
};
