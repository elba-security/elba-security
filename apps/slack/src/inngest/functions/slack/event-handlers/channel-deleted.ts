import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelDeletedHandler: SlackEventHandler<'channel_deleted'> = async (
  { team_id: teamId, event: { channel: channelId } },
  { step }
) => {
  await db
    .delete(conversations)
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, channelId)));

  await step.sendEvent('synchronize-conversations', {
    name: 'conversations/synchronize',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Channel deleted', teamId, channelId };
};
