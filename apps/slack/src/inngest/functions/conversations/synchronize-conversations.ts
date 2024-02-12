import { and, eq, lt, sql } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { db } from '@/database/client';
import type { NewConversation } from '@/database/schema';
import { conversationsTable, teamsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export type SynchronizeConversationsEvents = {
  'slack/conversations.sync.requested': SynchronizeConversationsRequested;
};

type SynchronizeConversationsRequested = {
  data: {
    teamId: string;
    syncStartedAt: string;
    isFirstSync: boolean;
    cursor?: string;
  };
};

export const synchronizeConversations = inngest.createFunction(
  {
    id: 'slack-synchronize-conversations',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.SLACK_SYNC_CONVERSATIONS_RETRY,
  },
  {
    event: 'slack/conversations.sync.requested',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, syncStartedAt, cursor },
    },
    step,
  }) => {
    const { token, elbaOrganisationId, elbaRegion } = await step.run('get-team', async () => {
      const result = await db.query.teamsTable.findFirst({
        where: eq(teamsTable.id, teamId),
        columns: { token: true, elbaOrganisationId: true, elbaRegion: true },
      });

      if (!result) {
        throw new Error('Failed to find team');
      }

      return {
        token: result.token,
        elbaOrganisationId: result.elbaOrganisationId,
        elbaRegion: result.elbaRegion,
      };
    });

    const { channels, nextCursor } = await step.run('list-conversations', async () => {
      const decryptedToken = await decrypt(token);
      const slackClient = new SlackAPIClient(decryptedToken);
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
          .insert(conversationsTable)
          .values(conversationsToInsert)
          .onConflictDoUpdate({
            target: [conversationsTable.teamId, conversationsTable.id],
            set: {
              name: sql`excluded.name`,
              isSharedExternally: sql`excluded.is_shared_externally`,
              lastSyncedAt: new Date(),
            },
          });
      });

      const eventsToWait = conversationsToInsert.map(({ id: conversationId }) =>
        step.waitForEvent(`wait-for-message-complete-${conversationId}`, {
          event: 'slack/conversations.sync.messages.completed',
          timeout: '1 day',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}'`,
        })
      );

      await step.sendEvent(
        'start-conversations-messages-synchronization',
        conversationsToInsert.map(({ id: conversationId }) => ({
          name: 'slack/conversations.sync.messages.requested',
          data: { teamId, conversationId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'slack/conversations.sync.requested',
        data: { teamId, syncStartedAt, isFirstSync, cursor: nextCursor },
      });
    } else {
      await step.run('delete-conversations', async () => {
        await db
          .delete(conversationsTable)
          .where(
            and(
              eq(conversationsTable.teamId, teamId),
              lt(conversationsTable.lastSyncedAt, new Date(syncStartedAt))
            )
          );
      });

      const elbaClient = createElbaClient(elbaOrganisationId, elbaRegion);
      await elbaClient.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });
    }

    return { conversationsToInsert, nextCursor };
  }
);
