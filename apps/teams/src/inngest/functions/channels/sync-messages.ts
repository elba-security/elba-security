import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getMessages } from '@/connectors/microsoft/messages/messages';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';

export const syncMessages = inngest.createFunction(
  {
    id: 'sync-messages',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
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

    const { nextSkipToken, validMessages: messages } = await step.run('paginate', async () => {
      const result = await getMessages({
        token: await decrypt(organisation.token),
        teamId,
        skipToken,
        channelId,
      });

      if (result.invalidMessages.length > 0) {
        logger.warn('Retrieved messages contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidMessages: result.invalidMessages,
        });
      }

      return result;
    });

    const elbaClient = createElbaClient(organisationId, organisation.region);

    await step.run('elba-data-sync', async () => {
      if (!messages.length) {
        return;
      }

      const objects = messages.map((message) => {
        return formatDataProtectionObject({
          teamId,
          messageId: message.id,
          channelId,
          channelName,
          organisationId,
          membershipType,
          message,
        });
      });

      await elbaClient.dataProtection.updateObjects({ objects });
    });

    if (messages.length) {
      const eventsWait = messages.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-replies-complete-${id}`, {
          event: 'teams/replies.sync.completed',
          timeout: '1d',

          if: `async.data.organisationId == '${organisationId}' && async.data.messageId == '${id}'`,
        });
      });

      await step.sendEvent(
        'start-replies-sync',
        messages.map(({ id }) => ({
          name: 'teams/replies.sync.triggered',
          data: {
            messageId: id,
            channelId,
            organisationId,
            teamId,
            channelName,
            membershipType,
          },
        }))
      );

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
