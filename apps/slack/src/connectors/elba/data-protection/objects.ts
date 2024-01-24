import type { DataProtectionObject } from '@elba-security/sdk';
import {
  type SlackMessage,
  getMessageUrl,
  convertTsToIsoString,
} from '@/connectors/slack/messages';
import type { MessageMetadata } from './metadata';

export const formatDataProtectionObjectId = ({
  teamId,
  conversationId,
  messageId,
}: {
  teamId: string;
  conversationId: string;
  messageId: string;
}) => {
  return JSON.stringify([teamId, conversationId, messageId]);
};

export const formatDataProtectionObject = ({
  teamId,
  teamUrl,
  conversationId,
  conversationName,
  isConversationSharedExternally,
  threadId,
  message,
}: {
  teamId: string;
  teamUrl: string;
  conversationId: string;
  conversationName: string;
  isConversationSharedExternally: boolean;
  threadId?: string;
  message: SlackMessage;
}): DataProtectionObject => {
  const messageId = message.ts;
  const dataProtectionObjectId = formatDataProtectionObjectId({
    teamId,
    conversationId,
    messageId,
  });
  const url = getMessageUrl({ teamUrl, conversationId, messageId, threadId });
  const sentAt = convertTsToIsoString(messageId);
  let editedAt: string | undefined;
  if (message.edited?.ts) {
    editedAt = convertTsToIsoString(message.edited.ts);
  }

  return {
    id: dataProtectionObjectId,
    name: `${sentAt} #${conversationName}`,
    metadata: {
      teamId,
      conversationId,
      messageId,
      type: threadId ? 'reply' : 'message',
    } satisfies MessageMetadata,
    updatedAt: editedAt,
    ownerId: message.user,
    permissions: [
      isConversationSharedExternally
        ? {
            type: 'anyone',
            id: 'anyone',
          }
        : {
            type: 'domain',
            id: 'domain',
          },
    ],
    url,
  };
};
