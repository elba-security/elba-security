import { and, eq } from 'drizzle-orm';
import { SlackAPIClient, SlackAPIError } from 'slack-web-api-client';
import type { MessageElement } from 'slack-web-api-client/dist/client/generated-response/ConversationsHistoryResponse';
import { decrypt } from '@/common/crypto';
import { conversationsTable } from '@/database/schema';
import { db } from '@/database/client';
import {
  formatDataProtectionObject,
  formatDataProtectionObjectId,
} from '@/connectors/elba/data-protection/objects';
import { createElbaClient } from '@/connectors/elba/client';
import { slackMessageSchema } from '@/connectors/slack/messages';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const refreshDataProtectionObject = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: unknown;
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);
  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  const { type, teamId, conversationId, messageId } = messageMetadataResult.data;

  const conversation = await db.query.conversationsTable.findFirst({
    where: and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, conversationId)),
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
          token: true,
        },
      },
    },
  });

  if (!conversation || conversation.team.elbaOrganisationId !== organisationId) {
    throw new Error("Couldn't find conversation");
  }

  const token = await decrypt(conversation.team.token);

  const objectId = formatDataProtectionObjectId({ teamId, conversationId, messageId });
  const slackClient = new SlackAPIClient(token);
  let messages: MessageElement[] | undefined = [];
  if (type === 'reply') {
    try {
      ({ messages } = await slackClient.conversations.replies({
        channel: conversationId,
        ts: messageId,
        inclusive: true,
        limit: 1,
      }));
    } catch (e) {
      // If the error type is thread_not_found, we ignore it to delete the issue
      if (!(e instanceof SlackAPIError) || e.error !== 'thread_not_found') {
        throw e;
      }
    }
  } else {
    ({ messages } = await slackClient.conversations.history({
      channel: conversationId,
      oldest: messageId,
      inclusive: true,
      limit: 1,
    }));
  }

  if (!messages) {
    throw new Error('Failed to retrieve message');
  }

  const [message] = messages;

  const elbaClient = createElbaClient(organisationId, conversation.team.elbaRegion);

  // @ts-expect-error -- Type doesn't include the hidden attribute
  if (!message || message.hidden) {
    await elbaClient.dataProtection.deleteObjects({ ids: [objectId] });
    return;
  }

  if (message.ts !== messageId) {
    throw new Error('Failed to retrieve the right message');
  }

  const result = slackMessageSchema.safeParse(message);
  if (!result.success) {
    throw new Error('Failed to parse message');
  }

  const object = formatDataProtectionObject({
    teamId,
    teamUrl: conversation.team.url,
    conversationId,
    conversationName: conversation.name,
    isConversationSharedExternally: conversation.isSharedExternally,
    threadId: result.data.thread_ts,
    message: result.data,
  });

  await elbaClient.dataProtection.updateObjects({ objects: [object] });
};
