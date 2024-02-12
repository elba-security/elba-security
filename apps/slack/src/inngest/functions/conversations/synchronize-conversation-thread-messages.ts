import type { DataProtectionObject } from '@elba-security/sdk';
import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { env } from '@/common/env';
import { db } from '@/database/client';
import { conversationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/objects';
import { slackMessageSchema } from '@/connectors/slack/messages';
import { decrypt } from '@/common/crypto';

export type SynchronizeConversationThreadMessagesEvents = {
  'slack/conversations.sync.thread.messages.requested': SynchronizeConversationThreadMessagesRequested;
  'slack/conversations.sync.thread.messages.completed': SynchronizeConversationThreadMessagesCompleted;
};

type SynchronizeConversationThreadMessagesRequested = {
  data: {
    teamId: string;
    isFirstSync: boolean;
    conversationId: string;
    threadId: string;
    cursor?: string;
  };
};

type SynchronizeConversationThreadMessagesCompleted = {
  data: {
    teamId: string;
    conversationId: string;
    threadId: string;
    cursor?: string;
  };
};

export const synchronizeConversationThreadMessages = inngest.createFunction(
  {
    id: 'slack-synchronize-conversation-thread-messages',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      limit: env.SLACK_SYNC_CONVERSATIONS_THREAD_MESSAGES_CONCURRENCY,
      key: 'event.data.teamId',
    },
    retries: env.SLACK_SYNC_CONVERSATIONS_THREAD_MESSAGES_RETRY,
  },
  {
    event: 'slack/conversations.sync.thread.messages.requested',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, conversationId, threadId, cursor },
    },
    step,
  }) => {
    const conversation = await db.query.conversationsTable.findFirst({
      where: and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, conversationId)),
      columns: {
        name: true,
        isSharedExternally: true,
      },
      with: {
        team: {
          columns: {
            elbaOrganisationId: true,
            elbaRegion: true,
            url: true,
            token: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Failed to find conversation');
    }

    const token = await decrypt(conversation.team.token);
    const slackClient = new SlackAPIClient(token);

    const { messages, response_metadata: responseMetadata } =
      await slackClient.conversations.replies({
        channel: conversationId,
        ts: threadId,
        // limit: 2,
        cursor,
        limit: env.SLACK_CONVERSATIONS_REPLIES_BATCH_SIZE,
      });

    if (!messages) {
      throw new Error('An error occurred while listing slack conversations');
    }

    const objects: DataProtectionObject[] = [];
    for (const message of messages) {
      const result = slackMessageSchema.safeParse(message);

      if (message.type !== 'message' || message.team !== teamId || !result.success) {
        continue;
      }

      const object = formatDataProtectionObject({
        teamId,
        teamUrl: conversation.team.url,
        conversationId,
        conversationName: conversation.name,
        isConversationSharedExternally: conversation.isSharedExternally,
        threadId,
        message: result.data,
      });

      objects.push(object);
    }

    const elbaClient = createElbaClient(
      conversation.team.elbaOrganisationId,
      conversation.team.elbaRegion
    );
    await elbaClient.dataProtection.updateObjects({ objects });

    const nextCursor = responseMetadata?.next_cursor;
    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'slack/conversations.sync.thread.messages.requested',
        data: {
          teamId,
          conversationId,
          threadId,
          isFirstSync,
          cursor: nextCursor,
        },
      });
    } else {
      await step.sendEvent('thread-sync-complete', {
        name: 'slack/conversations.sync.thread.messages.completed',
        data: { teamId, conversationId, threadId },
      });
    }

    return { objects: objects.length, nextCursor };
  }
);
