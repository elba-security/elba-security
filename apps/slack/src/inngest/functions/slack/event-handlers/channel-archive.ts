import { and, eq } from 'drizzle-orm';
import { conversationsTable } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelArchiveHandler: SlackEventHandler<'channel_archive'> = async (
  { team_id: teamId, event: { channel: channelId } },
  { step }
) => {
  await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, channelId)));

  await step.sendEvent('synchronize-conversations', {
    name: 'slack/conversations.sync.requested',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Channel archived', teamId, channelId };
};
