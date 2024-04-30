import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getMessages } from '@/connectors/microsoft/messages/messages';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';
import { chunkObjects } from '@/common/utils';

export const syncMessages = inngest.createFunction(
  {
    id: 'teams-sync-messages',
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
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.MESSAGES_SYNC_MAX_RETRY,
  },
  { event: 'teams/messages.sync.requested' },
  async ({ event, step, logger }) => {
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

    const { nextSkipToken, syncedMessages } = await step.run('paginate', async () => {
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

      const elbaClient = createElbaClient(organisationId, organisation.region);

      if (filterMessages.length) {
        const formatObjects = filterMessages
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

        const chunkedArray = chunkObjects(formatObjects, 1000);

        await Promise.all(
          chunkedArray.map((objects) => elbaClient.dataProtection.updateObjects({ objects }))
        );
      }

      const selectedMessagesFields = filterMessages.map((message) => ({
        id: message.id,
        'replies@odata.nextLink': message['replies@odata.nextLink'],
      }));

      return { nextSkipToken: messages.nextSkipToken, syncedMessages: selectedMessagesFields };
    });

    if (syncedMessages.length) {
      const messagesToSyncReplies = syncedMessages.filter((message) =>
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
              name: 'teams/replies.sync.requested',
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
        name: 'teams/messages.sync.requested',
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
