import { eq, sql } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getMessages } from '@/connectors/microsoft/messages/messages';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';

export const syncMessages = inngest.createFunction(
  {
    id: 'sync-messages',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    onFailure: async ({ event, step }) => {
      const { organisationId, channelId } = event.data.event.data;

      await step.sendEvent('messages-sync-complete', {
        name: 'teams/messages.sync.completed',
        data: {
          channelId,
          organisationId,
        },
      });
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.MESSAGES_SYNC_MAX_RETRY,
  },
  { event: 'teams/messages.sync.triggered' },
  async ({ event, step }) => {
    const { organisationId, teamId, skipToken, channelId, channelName, membershipType } =
      event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { nextSkipToken, validMessages } = await step.run('paginate', async () => {
      const messages = await getMessages({
        token: await decrypt(organisation.token),
        teamId,
        skipToken,
        channelId,
      });

      if (messages.invalidMessages.length > 0) {
        logger.warn('Retrieved messages contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidMessages: messages.invalidMessages,
        });
      }

      const filterMessages = messages.validMessages.filter(
        (message) => message.messageType === 'message'
      );

      return { ...messages, validMessages: filterMessages };
    });

    await step.run('elba-data-sync', async () => {
      const elbaClient = createElbaClient(organisationId, organisation.region);

      if (validMessages.length) {
        const objects = validMessages
          .flatMap((message) => [
            { ...message, messageId: message.id },
            ...message.replies.map((reply) => ({
              ...reply,
              replyId: reply.id,
              messageId: message.id,
            })),
          ])
          .map((message) => {
            return formatDataProtectionObject({
              teamId,
              messageId: message.messageId,
              channelId,
              channelName,
              organisationId,
              membershipType,
              replyId: 'replyId' in message ? message.replyId : undefined,
              message,
            });
          });

        await elbaClient.dataProtection.updateObjects({ objects });
      }
    });

    await step.run('add-messages-to-db', async () => {
      if (validMessages.length) {
        const messagesIds = validMessages.map((message) => message.id);

        await db
          .update(channelsTable)
          .set({
            messages: sql`array_cat(
                ${channelsTable.messages},
                ${`{${messagesIds.join(', ')}}`}
                )`,
          })
          .where(eq(channelsTable.id, channelId));
      }
    });

    if (validMessages.length) {
      const messagesToSyncReplies = validMessages.filter((message) =>
        Boolean(message['replies@odata.nextLink'])
      );

      const eventsWait = messagesToSyncReplies.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-replies-complete-${id}`, {
          event: 'teams/replies.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.messageId == '${id}'`,
        });
      });

      if (messagesToSyncReplies.length) {
        await step.sendEvent(
          'start-replies-sync',
          messagesToSyncReplies.map((message) => {
            const urlParams = new URLSearchParams(message['replies@odata.nextLink']?.split('$')[1]);

            return {
              name: 'teams/replies.sync.triggered',
              data: {
                messageId: message.id,
                channelId,
                organisationId,
                teamId,
                channelName,
                membershipType,
                skipToken: urlParams.get('skipToken'),
              },
            };
          })
        );
      }

      await Promise.all(eventsWait);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-messages-page', {
        name: 'teams/messages.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }
    await step.sendEvent('messages-sync-complete', {
      name: 'teams/messages.sync.completed',
      data: {
        channelId,
        organisationId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
