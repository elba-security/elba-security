import { and, eq, lt, sql } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { db } from '@/database/client';
import type { NewConversation } from '@/database/schema';
import { conversations, teams } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export type SynchronizeConversationsEvents = {
  'conversations/synchronize': SynchronizeConversations;
};

type SynchronizeConversations = {
  data: {
    teamId: string;
    syncStartedAt: string;
    isFirstSync: boolean;
    cursor?: string;
  };
};

export const synchronizeConversations = inngest.createFunction(
  {
    id: 'synchronize-conversations',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
  },
  {
    event: 'conversations/synchronize',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, syncStartedAt, cursor },
    },
    step,
  }) => {
    const { token, elbaOrganisationId, elbaRegion } = await step.run('get-token', async () => {
      const result = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
        columns: { token: true, elbaOrganisationId: true, elbaRegion: true },
      });

      if (!result) {
        throw new Error('Failed to find team');
      }

      const decryptedToken = await decrypt(result.token);
      return {
        token: decryptedToken,
        elbaOrganisationId: result.elbaOrganisationId,
        elbaRegion: result.elbaRegion,
      };
    });

    const { channels, nextCursor } = await step.run('list-conversations', async () => {
      const slackClient = new SlackAPIClient(token);
      const { channels: slackChannels, response_metadata: responseMetadata } =
        await slackClient.conversations.list({
          exclude_archived: true,
          cursor,
          limit: env.SLACK_CONVERSATIONS_LIST_BATCH_SIZE,
          types: 'public_channel', // We only support public channels for now
        });

      if (!slackChannels) {
        throw new Error('An error occurred while listing slack conversations');
      }

      return { channels: slackChannels, nextCursor: responseMetadata?.next_cursor };
    });

    const conversationsToInsert: NewConversation[] = [];
    for (const channel of channels) {
      if (channel.id && channel.name) {
        conversationsToInsert.push({
          teamId,
          id: channel.id,
          name: channel.name,
          isSharedExternally: Boolean(channel.is_ext_shared),
          lastSyncedAt: new Date(),
        });
      }
    }

    if (conversationsToInsert.length) {
      await step.run('insert-conversations', async () => {
        await db
          .insert(conversations)
          .values(conversationsToInsert)
          .onConflictDoUpdate({
            target: [conversations.teamId, conversations.id],
            set: {
              name: sql`excluded.name`,
              isSharedExternally: sql`excluded.is_shared_externally`,
              lastSyncedAt: new Date(),
            },
          });
      });

      const eventsToWait = conversationsToInsert.map(({ id: conversationId }) =>
        step.waitForEvent(`wait-for-message-complete-${conversationId}`, {
          event: 'conversations/synchronize.messages.complete',
          timeout: '1 day',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}'`,
        })
      );

      await step.sendEvent(
        'start-conversations-messages-synchronization',
        conversationsToInsert.map(({ id: conversationId }) => ({
          name: 'conversations/synchronize.messages',
          data: { teamId, conversationId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'conversations/synchronize',
        data: { teamId, syncStartedAt, isFirstSync, cursor: nextCursor },
      });
    } else {
      await step.run('delete-conversations', async () => {
        await db
          .delete(conversations)
          .where(
            and(
              eq(conversations.teamId, teamId),
              lt(conversations.lastSyncedAt, new Date(syncStartedAt))
            )
          );
      });

      const elbaClient = createElbaClient(elbaOrganisationId, elbaRegion);
      await elbaClient.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });
    }

    return { conversationsToInsert, nextCursor };
  }
);
