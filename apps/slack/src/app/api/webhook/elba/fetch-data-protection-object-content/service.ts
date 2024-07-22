import { and, eq } from 'drizzle-orm';
import { SlackAPIClient, SlackAPIError } from 'slack-web-api-client';
import type { MessageElement } from 'slack-web-api-client/dist/client/generated-response/ConversationsHistoryResponse';
import { logger } from '@elba-security/logger';
import { decrypt } from '@/common/crypto';
import { teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const LOG_SCOPE = 'slack-fetch-data-protection-object-content';

export const fetchDataProtectionObjectContent = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: unknown;
}) => {
  logger.info('Validating metadata', { scope: LOG_SCOPE });
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);
  if (!messageMetadataResult.success) {
    logger.error('Invalid message metadata', { scope: LOG_SCOPE });
    throw new Error('Invalid message metadata');
  }

  logger.info('Retrieving team info', { scope: LOG_SCOPE });
  const { type, teamId, conversationId, messageId } = messageMetadataResult.data;
  const team = await db.query.teamsTable.findFirst({
    where: and(eq(teamsTable.id, teamId), eq(teamsTable.elbaOrganisationId, organisationId)),
    columns: {
      token: true,
    },
  });
  if (!team) {
    logger.error("Couldn't find team", { teamId, scope: LOG_SCOPE });
    throw new Error("Couldn't find team");
  }

  logger.info('Decrypting token', { scope: LOG_SCOPE });
  const token = await decrypt(team.token);

  const slackClient = new SlackAPIClient(token);
  let messages: MessageElement[] | undefined;
  logger.info('Retrieving message', { type, scope: LOG_SCOPE });
  try {
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
  } catch (error) {
    if (error instanceof SlackAPIError && error.error === 'ratelimited') {
      logger.error('Slack rate limit reached while retrieving object content', {
        organisationId,
        conversationId,
        messageId,
        type,
        scope: LOG_SCOPE,
      });

      return null;
    }
  }

  if (!messages) {
    logger.error('Failed to retrieve message', { scope: LOG_SCOPE });
    throw new Error('Failed to retrieve message');
  }

  const [message] = messages;
  if (!message || message.ts !== messageId) {
    logger.error('Failed to retrieve the right message', { scope: LOG_SCOPE });
    throw new Error('Failed to retrieve the right message');
  }

  return message.text;
};
