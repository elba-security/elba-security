import { SlackAPIClient } from 'slack-web-api-client';
import { eq } from 'drizzle-orm';
import { conversationsTable, teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import { slackChannelSchema } from '@/connectors/slack/channels';
import { decrypt } from '@/common/crypto';
import type { SlackEventHandler } from './types';

export const channelUnarchiveHandler: SlackEventHandler<'channel_unarchive'> = async (
  { team_id: teamId, event: { channel: channelId } },
  { step }
) => {
  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.id, teamId),
    columns: { token: true },
  });

  if (!team) {
    throw new Error('Failed to find team');
  }

  const token = await decrypt(team.token);
  const slackClient = new SlackAPIClient(token);
  const response = await slackClient.conversations.info({
    channel: channelId,
  });

  if (!response.channel) {
    throw new Error('Failed to get channel info');
  }

  const result = slackChannelSchema.safeParse(response.channel);
  if (!result.success) {
    throw new Error('Failed to parse channel info');
  }

  await db
    .insert(conversationsTable)
    .values({
      teamId,
      id: result.data.id,
      name: result.data.name,
      lastSyncedAt: new Date(),
      isSharedExternally: Boolean(result.data.is_ext_shared),
    })
    .onConflictDoUpdate({
      target: [conversationsTable.teamId, conversationsTable.id],
      set: {
        name: result.data.name,
        isSharedExternally: Boolean(result.data.is_ext_shared),
        lastSyncedAt: new Date(),
      },
    });

  await step.sendEvent('synchronize-conversation-messages', {
    name: 'slack/conversations.sync.messages.requested',
    data: {
      teamId,
      conversationId: result.data.id,
      isFirstSync: false,
    },
  });

  return { message: 'Channel unarchived', teamId, channelId };
};
