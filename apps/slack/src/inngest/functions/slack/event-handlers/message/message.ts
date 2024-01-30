import type { GenericMessageEvent } from '@slack/bolt';
import { and, eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { conversationsTable } from '@/database/schema';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/objects';
import { slackMessageSchema } from '@/connectors/slack/messages';
import { createElbaClient } from '@/connectors/elba/client';

// TODO: handle inngest context & add steps?
export const genericMessageHandler = async (event: GenericMessageEvent) => {
  // TODO: check no subtype?
  const result = slackMessageSchema.safeParse(event);
  // TODO: remove condition? Confirm working for slack connect: seems ok
  const teamId = event.team;
  if (!teamId || !result.success) {
    return {
      message: 'Ignored: invalid generic message input',
      teamId,
      channelId: event.channel,
      messageId: event.ts,
    };
  }

  const conversation = await db.query.conversationsTable.findFirst({
    where: and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, event.channel)),
    columns: {
      name: true,
      isSharedExternally: true,
    },
    with: {
      team: {
        columns: {
          url: true,
          elbaOrganisationId: true,
          elbaRegion: true,
        },
      },
    },
  });

  if (!conversation) {
    // We don't throw an error as the message might come from a slack connect channel where the other team hasn't installed the app
    return {
      message: 'Ignored: conversation not found',
      teamId,
      channelId: event.channel,
      messageId: event.ts,
    };
  }

  const {
    team: { url: teamUrl, elbaOrganisationId, elbaRegion },
    name: conversationName,
  } = conversation;

  const object = formatDataProtectionObject({
    teamId,
    teamUrl,
    conversationId: event.channel,
    conversationName,
    isConversationSharedExternally: conversation.isSharedExternally,
    threadId: result.data.thread_ts,
    message: result.data,
  });

  const elbaClient = createElbaClient(elbaOrganisationId, elbaRegion);
  await elbaClient.dataProtection.updateObjects({ objects: [object] });

  return {
    message: 'Message handled',
    teamId,
    channelId: event.channel,
    messageId: event.ts,
  };
};
