import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import type { DataProtectionObject } from '@elba-security/sdk';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { conversationsTable } from '@/database/schema';
import { slackMessageSchema } from '@/connectors/slack/messages';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/objects';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export type SynchronizeConversationMessagesEvents = {
  'slack/conversations.sync.messages.requested': SynchronizeConversationMessagesRequested;
  'slack/conversations.sync.messages.completed': SynchronizeConversationMessagesCompleted;
};

type SynchronizeConversationMessagesRequested = {
  data: {
    teamId: string;
    isFirstSync: boolean;
    conversationId: string;
    cursor?: string;
  };
};

type SynchronizeConversationMessagesCompleted = {
  data: {
    teamId: string;
    conversationId: string;
  };
};

export const synchronizeConversationMessages = inngest.createFunction(
  {
    id: 'slack-synchronize-conversation-messages',
    concurrency: {
      limit: env.SLACK_SYNC_CONVERSATIONS_MESSAGES_CONCURRENCY,
      key: 'event.data.teamId + "-" + event.data.isFirstSync',
    },
    retries: env.SLACK_SYNC_CONVERSATIONS_MESSAGES_RETRY,
    onFailure: async ({ step, event }) => {
      await step.sendEvent('failed', {
        name: 'slack/conversations.sync.messages.completed',
        data: {
          conversationId: event.data.event.data.conversationId,
          teamId: event.data.event.data.teamId,
        },
      });
    },
  },
  {
    event: 'slack/conversations.sync.messages.requested',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, conversationId, cursor },
    },
    step,
  }) => {
    const conversation = await step.run('get-conversation', async () => {
      const result = await db.query.conversationsTable.findFirst({
        where: and(
          eq(conversationsTable.teamId, teamId),
          eq(conversationsTable.id, conversationId)
        ),
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

      if (!result) {
        throw new Error('Failed to find conversation');
      }

      return result;
    });

    const { objects, threadIds, nextCursor } = await step.run(
      'get-data-protection-objects',
      async () => {
        const token = await decrypt(conversation.team.token);
        const slackClient = new SlackAPIClient(token);
        const { messages, response_metadata: responseMetadata } =
          await slackClient.conversations.history({
            channel: conversationId,
            limit: env.SLACK_CONVERSATIONS_HISTORY_BATCH_SIZE,
            cursor,
          });

        if (!messages) {
          throw new Error('An error occurred while listing slack conversations');
        }

        const dpObjects: DataProtectionObject[] = [];
        const threads: string[] = [];
        for (const message of messages) {
          if (message.thread_ts) {
            threads.push(message.thread_ts);
          }

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
            message: result.data,
          });

          dpObjects.push(object);
        }

        return {
          objects: dpObjects,
          threadIds: threads,
          nextCursor: responseMetadata?.next_cursor,
        };
      }
    );

    await step.run('update-data-protection-objects', async () => {
      const elbaClient = createElbaClient(
        conversation.team.elbaOrganisationId,
        conversation.team.elbaRegion
      );
      return elbaClient.dataProtection.updateObjects({ objects });
    });

    if (threadIds.length) {
      const eventsToWait = threadIds.map(async (threadId) => {
        return step.waitForEvent(`wait-for-thread-message-sync-complete-${threadId}`, {
          event: 'slack/conversations.sync.thread.messages.completed',
          timeout: '30 days',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}' && async.data.threadId == '${threadId}'`,
        });
      });

      await step.sendEvent(
        'start-conversation-thread-messages-synchronization',
        threadIds.map((threadId) => ({
          name: 'slack/conversations.sync.thread.messages.requested',
          data: { teamId, conversationId, threadId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'slack/conversations.sync.messages.requested',
        data: { teamId, conversationId, isFirstSync, cursor: nextCursor },
      });
    } else {
      await step.sendEvent('conversation-sync-complete', {
        name: 'slack/conversations.sync.messages.completed',
        data: { teamId, conversationId },
      });
    }

    return { threadIds, objects: objects.length, nextCursor };
  }
);
