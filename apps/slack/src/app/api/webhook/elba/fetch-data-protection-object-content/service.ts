import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import type { MessageElement } from 'slack-web-api-client/dist/client/generated-response/ConversationsHistoryResponse';
import { decrypt } from '@/common/crypto';
import { teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const fetchDataProtectionObjectContent = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: any; // eslint-disable-line -- metadata type is any
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);
  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  const { type, teamId, conversationId, messageId } = messageMetadataResult.data;
  const team = await db.query.teamsTable.findFirst({
    where: and(eq(teamsTable.id, teamId), eq(teamsTable.elbaOrganisationId, organisationId)),
    columns: {
      token: true,
    },
  });
  if (!team) {
    throw new Error("Couldn't find team");
  }

  const token = await decrypt(team.token);

  const slackClient = new SlackAPIClient(token);
  let messages: MessageElement[] | undefined;
  if (type === 'reply') {
    ({ messages } = await slackClient.conversations.replies({
      channel: conversationId,
      ts: messageId,
      inclusive: true,
      limit: 1,
    }));
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
  if (!message || message.ts !== messageId) {
    throw new Error('Failed to retrieve the right message');
  }

  return message.text;
};
