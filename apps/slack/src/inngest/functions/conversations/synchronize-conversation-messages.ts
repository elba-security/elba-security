import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import type { DataProtectionObject } from '@elba-security/sdk';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { conversations } from '@/database/schema';
import { slackMessageSchema } from '@/repositories/slack/messages';
import { formatDataProtectionObject } from '@/repositories/elba/data-protection/objects';
import { createElbaClient } from '@/repositories/elba/client';

export type SynchronizeConversationMessagesEvents = {
  'conversations/synchronize.messages': SynchronizeConversationMessages;
  'conversations/synchronize.messages.complete': SynchronizeConversationMessagesComplete;
};

type SynchronizeConversationMessages = {
  data: {
    teamId: string;
    isFirstSync: boolean;
    conversationId: string;
    cursor?: string;
  };
};

type SynchronizeConversationMessagesComplete = {
  data: {
    teamId: string;
    conversationId: string;
  };
};

export const synchronizeConversationMessages = inngest.createFunction(
  {
    id: 'synchronize-conversation-messages',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      limit: 3,
      key: 'event.data.teamId',
    },
    retries: 5,
  },
  {
    event: 'conversations/synchronize.messages',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, conversationId, cursor },
    },
    step,
  }) => {
    const conversation = await step.run('get-conversation', async () => {
      const result = await db.query.conversations.findFirst({
        with: {
          team: {
            columns: {
              elbaOrganisationId: true,
              url: true,
              token: true,
            },
          },
        },
        where: and(eq(conversations.teamId, teamId), eq(conversations.id, conversationId)),
        columns: {
          name: true,
        },
      });

      if (!result) {
        throw new Error('Failed to find conversation');
      }

      return result;
    });

    const { messages, nextCursor } = await step.run('get-messages', async () => {
      const slackWebClient = new SlackAPIClient(conversation.team.token);
      const { messages: responseMessages, response_metadata: responseMetadata } =
        await slackWebClient.conversations.history({
          channel: conversationId,
          limit: 2,
          // limit: 200,
          cursor,
        });

      if (!responseMessages) {
        throw new Error('An error occurred while listing slack conversations');
      }

      return { messages: responseMessages, nextCursor: responseMetadata?.next_cursor };
    });

    const objects: DataProtectionObject[] = [];
    const threadIds: string[] = [];
    for (const message of messages) {
      if (message.thread_ts) {
        threadIds.push(message.thread_ts);
      }

      const result = slackMessageSchema.safeParse(message);
      if (message.type !== 'message' || message.team !== teamId || !result.success) {
        // console.log({
        //   message: 'IGNORED',
        //   type: message.type,
        //   team: message.team === teamId,
        //   success: result.success,
        //   messageData: message,
        // });
        continue;
      }

      // console.log(message);

      const object = formatDataProtectionObject({
        teamId,
        teamUrl: conversation.team.url,
        conversationId,
        conversationName: conversation.name,
        message: result.data,
      });

      objects.push(object);
    }

    const elbaClient = createElbaClient(conversation.team.elbaOrganisationId);
    await elbaClient.dataProtection.updateObjects({ objects });

    if (threadIds.length) {
      console.log({ threadIds });
      const eventsToWait = threadIds.map(async (threadId) => {
        return step.waitForEvent(`wait-for-thread-message-sync-complete-${threadId}`, {
          event: 'conversations/synchronize.thread.messages.complete',
          timeout: '1d',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}' && async.data.threadId == '${threadId}'`,
        });
        // console.log(`------ conv ${conversationId} thread ${threadId} ------`);
      });

      // console.log({ conversationId, threadIds });
      // const promises = threadIds.map((threadId) => {
      //   return step.waitForEvent('wait-for-thread-message-sync-complete', {
      //     event: 'conversations/synchronize.thread.messages.complete',
      //     timeout: '1d',
      //     if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}' && async.data.threadId == '${threadId}'`,
      //   });
      // });

      // await new Promise((resolve) => setTimeout(resolve, 1));

      // await step.sleep('sleep', 3000);
      await step.sendEvent(
        'start-conversation-thread-messages-synchronization',
        threadIds.map((threadId) => ({
          name: 'conversations/synchronize.thread.messages',
          data: { teamId, conversationId, threadId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'conversations/synchronize.messages',
        data: { teamId, conversationId, isFirstSync, cursor: nextCursor },
      });
    } else {
      // await step.run('over', async () => {
      //   console.log(`--- OVER ${conversationId} ---`);
      // });
      await step.sendEvent('conversation-sync-complete', {
        name: 'conversations/synchronize.messages.complete',
        data: { teamId, conversationId },
      });
    }

    return { threadIds, objects: objects.length, nextCursor };
  }
);
