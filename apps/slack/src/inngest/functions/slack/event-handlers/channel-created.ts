// import { SlackAPIClient } from 'slack-web-api-client';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
// import { env } from '@/common/env';
import type { SlackEventHandler } from './types';

export const channelCreatedHandler: SlackEventHandler<'channel_created'> = async ({
  team_id: teamId,
  event: {
    channel: { id: channelId, name: channelName },
  },
}) => {
  await db
    .insert(conversations)
    .values({
      teamId,
      id: channelId,
      name: channelName,
      isSharedExternally: false,
      lastSyncedAt: new Date(),
    })
    .onConflictDoNothing();

  return { message: 'Channel created', teamId, channelId, channelName };
};
